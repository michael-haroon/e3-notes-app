import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getFileStream } from "@/lib/storage";
import { canReadFile } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { Role } from "@/generated/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { fileId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileId } = params;
  const userId = session.user.id;
  const orgId = session.activeOrgId;

  if (!orgId) {
    return NextResponse.json({ error: "No active org" }, { status: 400 });
  }

  const file = await db.file.findUnique({
    where: { id: fileId },
    include: {
      note: { include: { shares: true } },
    },
  });

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const membership = await db.orgMember.findUnique({
    where: { orgId_userId: { orgId, userId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Not a member of active org" }, { status: 403 });
  }

  const userCtx = { id: userId, email: session.user.email };
  const orgCtx = { orgId, role: membership.role as Role };

  const noteCtx = file.note
    ? {
        note: {
          authorId: file.note.authorId,
          visibility: file.note.visibility,
          orgId: file.note.orgId,
        },
        shares: file.note.shares,
      }
    : undefined;

  if (!canReadFile(userCtx, orgCtx, file.orgId, noteCtx)) {
    await writeAuditLog({
      action: "file.permission_denied",
      userId,
      orgId,
      resourceId: fileId,
      resourceType: "file",
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const stream = await getFileStream(file.storageKey);

    await writeAuditLog({
      action: "file.download",
      userId,
      orgId,
      resourceId: fileId,
      resourceType: "file",
    });

    return new NextResponse(stream as unknown as ReadableStream, {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `inline; filename="${file.filename}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not accessible" }, { status: 500 });
  }
}
