"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import {
  canReadNote,
  canWriteNote,
  canChangeVisibility,
  canDeleteNote,
} from "@/lib/permissions";
import { Visibility, Role } from "@/generated/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function getSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (!session.activeOrgId) throw new Error("No active org");
  return {
    user: { id: session.user.id, email: session.user.email, name: session.user.name },
    orgId: session.activeOrgId,
    role: (session.activeOrgRole ?? "MEMBER") as Role,
  };
}

const createNoteSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().default(""),
  visibility: z.nativeEnum(Visibility).default(Visibility.ORG),
  tagIds: z.array(z.string()).default([]),
});

export async function createNote(input: z.infer<typeof createNoteSchema>) {
  const { user, orgId } = await getSession();
  const data = createNoteSchema.parse(input);

  const note = await db.$transaction(async (tx) => {
    const created = await tx.note.create({
      data: {
        title: data.title,
        content: data.content,
        visibility: data.visibility,
        orgId,
        authorId: user.id,
        tags: {
          create: data.tagIds.map((tagId) => ({ tagId })),
        },
      },
    });

    // Create initial version
    await tx.noteVersion.create({
      data: {
        noteId: created.id,
        version: 1,
        title: data.title,
        content: data.content,
        authorId: user.id,
      },
    });

    return created;
  });

  await writeAuditLog({
    action: "note.create",
    userId: user.id,
    orgId,
    resourceId: note.id,
    resourceType: "note",
  });

  revalidatePath("/dashboard");
  return { success: true, noteId: note.id };
}

const updateNoteSchema = z.object({
  noteId: z.string(),
  title: z.string().min(1).max(500).optional(),
  content: z.string().optional(),
  visibility: z.nativeEnum(Visibility).optional(),
  tagIds: z.array(z.string()).optional(),
});

export async function updateNote(input: z.infer<typeof updateNoteSchema>) {
  const { user, orgId, role } = await getSession();
  const data = updateNoteSchema.parse(input);

  const note = await db.note.findUnique({
    where: { id: data.noteId },
    include: { shares: true },
  });
  if (!note) throw new Error("Note not found");

  const noteCtx = {
    authorId: note.authorId,
    visibility: note.visibility,
    orgId: note.orgId,
  };

  if (!canWriteNote({ id: user.id, email: user.email }, { orgId, role }, noteCtx)) {
    await writeAuditLog({
      action: "note.permission_denied",
      userId: user.id,
      orgId,
      resourceId: note.id,
      resourceType: "note",
      metadata: { action: "update" },
    });
    throw new Error("Permission denied");
  }

  // Only the original author can change visibility
  if (data.visibility !== undefined && !canChangeVisibility({ id: user.id, email: user.email }, noteCtx)) {
    await writeAuditLog({
      action: "note.permission_denied",
      userId: user.id,
      orgId,
      resourceId: note.id,
      resourceType: "note",
      metadata: { action: "change_visibility" },
    });
    throw new Error("Only the original author can change visibility");
  }

  const updated = await db.$transaction(async (tx) => {
    const latestVersion = await tx.noteVersion.findFirst({
      where: { noteId: data.noteId },
      orderBy: { version: "desc" },
    });
    const nextVersion = (latestVersion?.version ?? 0) + 1;

    const upd = await tx.note.update({
      where: { id: data.noteId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.visibility !== undefined && { visibility: data.visibility }),
      },
    });

    await tx.noteVersion.create({
      data: {
        noteId: data.noteId,
        version: nextVersion,
        title: upd.title,
        content: upd.content,
        authorId: user.id,
      },
    });

    if (data.tagIds !== undefined) {
      await tx.noteTag.deleteMany({ where: { noteId: data.noteId } });
      if (data.tagIds.length > 0) {
        await tx.noteTag.createMany({
          data: data.tagIds.map((tagId) => ({ noteId: data.noteId, tagId })),
        });
      }
    }

    return upd;
  });

  await writeAuditLog({
    action: "note.update",
    userId: user.id,
    orgId,
    resourceId: note.id,
    resourceType: "note",
  });

  revalidatePath(`/notes/${data.noteId}`);
  revalidatePath("/dashboard");
  return { success: true, note: updated };
}

export async function deleteNote(noteId: string) {
  const { user, orgId, role } = await getSession();

  const note = await db.note.findUnique({ where: { id: noteId } });
  if (!note) throw new Error("Note not found");

  const noteCtx = {
    authorId: note.authorId,
    visibility: note.visibility,
    orgId: note.orgId,
  };

  if (!canDeleteNote({ id: user.id, email: user.email }, { orgId, role }, noteCtx)) {
    await writeAuditLog({
      action: "note.permission_denied",
      userId: user.id,
      orgId,
      resourceId: noteId,
      resourceType: "note",
      metadata: { action: "delete" },
    });
    throw new Error("Permission denied");
  }

  await db.note.delete({ where: { id: noteId } });

  await writeAuditLog({
    action: "note.delete",
    userId: user.id,
    orgId,
    resourceId: noteId,
    resourceType: "note",
  });

  revalidatePath("/dashboard");
  return { success: true };
}

export async function shareNote(noteId: string, shareWithUserId: string) {
  const { user, orgId } = await getSession();

  const note = await db.note.findUnique({ where: { id: noteId } });
  if (!note) throw new Error("Note not found");
  if (note.authorId !== user.id) throw new Error("Only the author can share this note");
  if (note.orgId !== orgId) throw new Error("Note belongs to a different org");
  if (note.visibility !== Visibility.PRIVATE) throw new Error("Only PRIVATE notes can be shared individually");

  // Verify shareWithUserId is a member of the same org
  const targetMembership = await db.orgMember.findUnique({
    where: { orgId_userId: { orgId: note.orgId, userId: shareWithUserId } },
  });
  if (!targetMembership) throw new Error("User is not a member of this org");

  await db.noteShare.upsert({
    where: { noteId_userId: { noteId, userId: shareWithUserId } },
    create: { noteId, userId: shareWithUserId },
    update: {},
  });

  await writeAuditLog({
    action: "note.share",
    userId: user.id,
    orgId,
    resourceId: noteId,
    resourceType: "note",
    metadata: { sharedWithUserId: shareWithUserId },
  });

  revalidatePath(`/notes/${noteId}`);
  return { success: true };
}

export async function unshareNote(noteId: string, shareWithUserId: string) {
  const { user, orgId } = await getSession();

  const note = await db.note.findUnique({ where: { id: noteId } });
  if (!note) throw new Error("Note not found");
  if (note.authorId !== user.id) throw new Error("Only the author can unshare this note");

  await db.noteShare.deleteMany({
    where: { noteId, userId: shareWithUserId },
  });

  await writeAuditLog({
    action: "note.unshare",
    userId: user.id,
    orgId,
    resourceId: noteId,
    resourceType: "note",
    metadata: { unsharedUserId: shareWithUserId },
  });

  revalidatePath(`/notes/${noteId}`);
  return { success: true };
}

export async function getSharedWithMe() {
  const { user } = await getSession();

  return db.note.findMany({
    where: {
      shares: { some: { userId: user.id } },
    },
    include: {
      author: { select: { id: true, name: true, email: true } },
      tags: { include: { tag: true } },
      _count: { select: { versions: true, files: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getNoteWithPermission(noteId: string) {
  const { user, orgId, role } = await getSession();

  const note = await db.note.findUnique({
    where: { id: noteId },
    include: {
      author: { select: { id: true, name: true, email: true } },
      tags: { include: { tag: true } },
      shares: { include: { user: { select: { id: true, name: true, email: true } } } },
      versions: { orderBy: { version: "desc" }, take: 10 },
      files: true,
      aiSummaries: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!note) throw new Error("Note not found");

  const noteCtx = {
    authorId: note.authorId,
    visibility: note.visibility,
    orgId: note.orgId,
  };

  if (
    !canReadNote(
      { id: user.id, email: user.email },
      { orgId, role },
      noteCtx,
      note.shares
    )
  ) {
    await writeAuditLog({
      action: "note.permission_denied",
      userId: user.id,
      orgId,
      resourceId: noteId,
      resourceType: "note",
      metadata: { action: "read" },
    });
    throw new Error("Permission denied");
  }

  await writeAuditLog({
    action: "note.read",
    userId: user.id,
    orgId,
    resourceId: noteId,
    resourceType: "note",
  });

  return note;
}
