import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { canReadNote } from "@/lib/permissions";
import { Role } from "@/generated/prisma/enums";

export async function GET(
  _req: NextRequest,
  { params }: { params: { noteId: string } }
) {
  let session;
  try {
    session = await getSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { noteId } = params;
  const userId = session.user.id;
  const orgId = session.activeOrgId;

  if (!orgId) {
    return NextResponse.json({ error: "No active org" }, { status: 400 });
  }

  const membership = await db.orgMember.findUnique({
    where: { orgId_userId: { orgId, userId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const note = await db.note.findUnique({
    where: { id: noteId },
    include: { shares: true },
  });
  if (!note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  const noteCtx = { authorId: note.authorId, visibility: note.visibility, orgId: note.orgId };
  if (!canReadNote({ id: userId, email: session.user.email }, { orgId, role: membership.role as Role }, noteCtx, note.shares)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const comments = await db.comment.findMany({
    where: { noteId },
    include: { author: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ comments });
}
