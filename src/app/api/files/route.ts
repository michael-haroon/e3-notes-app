import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  let session;
  try {
    session = await getSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = session.activeOrgId;
  if (!orgId) {
    return NextResponse.json({ error: "No active org" }, { status: 400 });
  }

  const userId = session.user.id;

  const membership = await db.orgMember.findUnique({
    where: { orgId_userId: { orgId, userId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Not a member of active org" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const noteId = searchParams.get("noteId") ?? undefined;

  const files = await db.file.findMany({
    where: {
      orgId,
      ...(noteId ? { noteId } : {}),
    },
    select: {
      id: true,
      filename: true,
      mimeType: true,
      size: true,
      noteId: true,
      createdAt: true,
      // storageKey is intentionally excluded — never returned to client
    },
    orderBy: { createdAt: "desc" },
  });

  const response = files.map((file) => ({
    id: file.id,
    filename: file.filename,
    mimeType: file.mimeType,
    size: file.size,
    url: `/api/files/${file.id}`,
    noteId: file.noteId,
    createdAt: file.createdAt,
  }));

  return NextResponse.json({ files: response });
}
