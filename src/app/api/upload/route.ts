import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { uploadFile } from "@/lib/storage";
import { writeAuditLog } from "@/lib/audit";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(req: NextRequest) {
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

  // Verify org membership
  const membership = await db.orgMember.findUnique({
    where: { orgId_userId: { orgId, userId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Not a member of active org" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const noteId = formData.get("noteId") as string | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 413 });
  }

  // If noteId provided, verify note belongs to this org
  if (noteId) {
    const note = await db.note.findFirst({
      where: { id: noteId, orgId },
    });
    if (!note) {
      return NextResponse.json({ error: "Note not found in org" }, { status: 404 });
    }
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storageKey = await uploadFile(buffer, file.type, file.name);

  const dbFile = await db.file.create({
    data: {
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      storageKey,
      orgId,
      uploaderId: userId,
      noteId: noteId ?? undefined,
    },
  });

  await writeAuditLog({
    action: "file.upload",
    userId,
    orgId,
    resourceId: dbFile.id,
    resourceType: "file",
    metadata: { filename: file.name, size: file.size, noteId },
  });

  return NextResponse.json({
    success: true,
    file: {
      id: dbFile.id,
      filename: dbFile.filename,
      mimeType: dbFile.mimeType,
      size: dbFile.size,
      url: `/api/files/${dbFile.id}`,
    },
  });
}
