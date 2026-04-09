import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { canReadNote } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { Role } from "@/generated/prisma/enums";

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

  if (!orgId) {
    return NextResponse.json({ error: "No active org" }, { status: 400 });
  }

  const membership = await db.orgMember.findUnique({
    where: { orgId_userId: { orgId, userId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Not a member of active org" }, { status: 403 });
  }

  const note = await db.note.findUnique({
    where: { id: noteId },
    include: {
      author: { select: { name: true, email: true } },
      tags: { include: { tag: true } },
      shares: true,
    },
  });

  if (!note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  const noteCtx = { authorId: note.authorId, visibility: note.visibility, orgId: note.orgId };
  if (!canReadNote({ id: userId, email: session.user.email }, { orgId, role: membership.role as Role }, noteCtx, note.shares)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const authorName = note.author.name ?? note.author.email;
  const tags = note.tags.map((t) => `#${t.tag.name}`).join(" ");
  const createdAt = note.createdAt.toISOString().split("T")[0];
  const updatedAt = note.updatedAt.toISOString().split("T")[0];

  const markdown = [
    `# ${note.title}`,
    "",
    `**Author:** ${authorName}  `,
    `**Created:** ${createdAt}  `,
    `**Updated:** ${updatedAt}  `,
    `**Visibility:** ${note.visibility}`,
    tags ? `**Tags:** ${tags}` : null,
    "",
    "---",
    "",
    note.content || "",
  ]
    .filter((line) => line !== null)
    .join("\n");

  await writeAuditLog({
    action: "note.export",
    userId,
    orgId,
    resourceId: noteId,
    resourceType: "note",
  });

  const filename = note.title.replace(/[^a-z0-9_\-\s]/gi, "").trim().replace(/\s+/g, "-").toLowerCase() || "note";

  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.md"`,
    },
  });
}
