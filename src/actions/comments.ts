"use server";

function appError(message: string): Error {
  return new Error(`APP_ERROR:${message}`);
}

import { getSessionWithOrg } from "@/lib/session";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { canReadNote, isAtLeast } from "@/lib/permissions";
import { Role } from "@/generated/prisma/enums";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function getSession() {
  const s = await getSessionWithOrg();
  return { user: s.user, orgId: s.activeOrgId, role: s.activeOrgRole };
}

export async function createComment(noteId: string, content: string) {
  const { user, orgId, role } = await getSession();

  if (!content.trim()) throw appError("Comment cannot be empty");
  if (content.length > 5000) throw appError("Comment is too long (max 5000 characters)");

  const note = await db.note.findUnique({
    where: { id: noteId },
    include: { shares: true },
  });
  if (!note) throw appError("Note not found");

  const noteCtx = { authorId: note.authorId, visibility: note.visibility, orgId: note.orgId };
  if (!canReadNote({ id: user.id, email: user.email }, { orgId, role }, noteCtx, note.shares)) {
    throw appError("Permission denied");
  }

  const comment = await db.comment.create({
    data: { noteId, authorId: user.id, content: content.trim() },
  });

  await writeAuditLog({
    action: "comment.create",
    userId: user.id,
    orgId,
    resourceId: comment.id,
    resourceType: "comment",
    metadata: { noteId },
  });

  revalidatePath(`/notes/${noteId}`);
  return { success: true, commentId: comment.id };
}

export async function deleteComment(commentId: string) {
  const { user, orgId, role } = await getSession();

  const comment = await db.comment.findUnique({
    where: { id: commentId },
    include: { note: true },
  });
  if (!comment) throw appError("Comment not found");

  const isAuthor = comment.authorId === user.id;
  const isAdmin = isAtLeast(role as Role, Role.ADMIN);
  if (!isAuthor && !isAdmin) throw appError("Permission denied");

  await db.comment.delete({ where: { id: commentId } });

  await writeAuditLog({
    action: "comment.delete",
    userId: user.id,
    orgId,
    resourceId: commentId,
    resourceType: "comment",
    metadata: { noteId: comment.noteId },
  });

  revalidatePath(`/notes/${comment.noteId}`);
  return { success: true };
}

export async function getComments(noteId: string) {
  const { user, orgId, role } = await getSession();

  const note = await db.note.findUnique({
    where: { id: noteId },
    include: { shares: true },
  });
  if (!note) throw appError("Note not found");

  const noteCtx = { authorId: note.authorId, visibility: note.visibility, orgId: note.orgId };
  if (!canReadNote({ id: user.id, email: user.email }, { orgId, role }, noteCtx, note.shares)) {
    throw appError("Permission denied");
  }

  return db.comment.findMany({
    where: { noteId },
    include: { author: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
}

const editCommentSchema = z.object({
  commentId: z.string(),
  content: z.string().min(1).max(5000),
});

export async function editComment(input: z.infer<typeof editCommentSchema>) {
  const { user } = await getSession();
  const data = editCommentSchema.parse(input);

  const comment = await db.comment.findUnique({ where: { id: data.commentId } });
  if (!comment) throw appError("Comment not found");
  if (comment.authorId !== user.id) throw appError("Only the author can edit this comment");

  await db.comment.update({
    where: { id: data.commentId },
    data: { content: data.content.trim() },
  });

  revalidatePath(`/notes/${comment.noteId}`);
  return { success: true };
}
