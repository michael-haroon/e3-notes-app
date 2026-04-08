import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { canReadNote, canWriteNote } from "@/lib/permissions";
import { Role } from "@/generated/prisma/enums";
import { writeAuditLog } from "@/lib/audit";
import * as Diff from "diff";

export async function GET(
  req: NextRequest,
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

  if (!orgId) return NextResponse.json({ error: "No active org" }, { status: 400 });

  const [note, membership] = await Promise.all([
    db.note.findUnique({ where: { id: noteId }, include: { shares: true } }),
    db.orgMember.findUnique({ where: { orgId_userId: { orgId, userId } } }),
  ]);

  if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const canRead = canReadNote(
    { id: userId, email: session.user.email },
    { orgId, role: membership.role as Role },
    { authorId: note.authorId, visibility: note.visibility, orgId: note.orgId },
    note.shares
  );
  if (!canRead) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const versions = await db.noteVersion.findMany({
    where: { noteId },
    include: { author: { select: { id: true, name: true, email: true } } },
    orderBy: { version: "desc" },
  });

  // Optional: compute diff between two versions
  const url = new URL(req.url);
  const fromVersion = url.searchParams.get("from");
  const toVersion = url.searchParams.get("to");

  if (fromVersion && toVersion) {
    const [from, to] = await Promise.all([
      db.noteVersion.findFirst({
        where: { noteId, version: parseInt(fromVersion) },
      }),
      db.noteVersion.findFirst({
        where: { noteId, version: parseInt(toVersion) },
      }),
    ]);

    if (!from || !to) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    const contentDiff = Diff.createPatch(
      "content",
      from.content,
      to.content,
      `v${from.version}`,
      `v${to.version}`
    );
    const titleDiff = from.title !== to.title
      ? Diff.createPatch("title", from.title, to.title, `v${from.version}`, `v${to.version}`)
      : null;

    return NextResponse.json({ from, to, contentDiff, titleDiff });
  }

  return NextResponse.json({ versions });
}

export async function POST(
  req: NextRequest,
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
  if (!orgId) return NextResponse.json({ error: "No active org" }, { status: 400 });

  const { version } = await req.json() as { version: number };

  const [note, membership] = await Promise.all([
    db.note.findUnique({ where: { id: noteId }, include: { shares: true } }),
    db.orgMember.findUnique({ where: { orgId_userId: { orgId, userId } } }),
  ]);

  if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const noteCtx = { authorId: note.authorId, visibility: note.visibility, orgId: note.orgId };
  if (!canWriteNote({ id: userId, email: session.user.email }, { orgId, role: membership.role as Role }, noteCtx)) {
    await writeAuditLog({ action: "note.permission_denied", userId, orgId, resourceId: noteId, resourceType: "note", metadata: { action: "restore" } });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const targetVersion = await db.noteVersion.findFirst({ where: { noteId, version } });
  if (!targetVersion) return NextResponse.json({ error: "Version not found" }, { status: 404 });

  const updated = await db.$transaction(async (tx) => {
    const latest = await tx.noteVersion.findFirst({ where: { noteId }, orderBy: { version: "desc" } });
    const nextVersion = (latest?.version ?? 0) + 1;

    const upd = await tx.note.update({
      where: { id: noteId },
      data: { title: targetVersion.title, content: targetVersion.content },
    });

    await tx.noteVersion.create({
      data: { noteId, version: nextVersion, title: targetVersion.title, content: targetVersion.content, authorId: userId },
    });

    return upd;
  });

  await writeAuditLog({ action: "note.restore", userId, orgId, resourceId: noteId, resourceType: "note", metadata: { restoredToVersion: version } });

  return NextResponse.json({ success: true, note: updated });
}
