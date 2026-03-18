import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateNoteSummary } from "@/lib/ai";
import { canReadNote } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { Role } from "@/generated/prisma";

// In-memory rate limiter: max 10 requests per hour per user
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count += 1;
  return true;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { noteId } = await req.json() as { noteId: string };
  const userId = session.user.id;
  const orgId = session.activeOrgId;

  if (!orgId || !noteId) {
    return NextResponse.json({ error: "Missing noteId or activeOrgId" }, { status: 400 });
  }

  if (!checkRateLimit(userId)) {
    return NextResponse.json(
      { error: "Rate limit exceeded: max 10 AI summarize requests per hour" },
      { status: 429 }
    );
  }

  const [note, membership] = await Promise.all([
    db.note.findUnique({ where: { id: noteId }, include: { shares: true } }),
    db.orgMember.findUnique({ where: { orgId_userId: { orgId, userId } } }),
  ]);

  if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const userCtx = { id: userId, email: session.user.email };
  const orgCtx = { orgId, role: membership.role as Role };
  const noteCtx = {
    authorId: note.authorId,
    visibility: note.visibility,
    orgId: note.orgId,
  };

  if (!canReadNote(userCtx, orgCtx, noteCtx, note.shares)) {
    await writeAuditLog({
      action: "ai.permission_denied",
      userId,
      orgId,
      resourceId: noteId,
      resourceType: "note",
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const summaryData = await generateNoteSummary(note.title, note.content);

  const summary = await db.aISummary.create({
    data: {
      noteId,
      content: JSON.stringify(summaryData),
      model: "llama-3.3-70b-versatile",
      accepted: false,
    },
  });

  await writeAuditLog({
    action: "ai.summarize",
    userId,
    orgId,
    resourceId: noteId,
    resourceType: "note",
    metadata: { summaryId: summary.id },
  });

  return NextResponse.json({ success: true, summary: { ...summary, data: summaryData } });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const noteId = searchParams.get("noteId");
  if (!noteId) {
    return NextResponse.json({ error: "Missing noteId" }, { status: 400 });
  }

  const userId = session.user.id;
  const orgId = session.activeOrgId;

  if (!orgId) {
    return NextResponse.json({ error: "No active org" }, { status: 400 });
  }

  const [note, membership] = await Promise.all([
    db.note.findUnique({ where: { id: noteId }, include: { shares: true } }),
    db.orgMember.findUnique({ where: { orgId_userId: { orgId, userId } } }),
  ]);

  if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const userCtx = { id: userId, email: session.user.email };
  const orgCtx = { orgId, role: membership.role as Role };
  const noteCtx = {
    authorId: note.authorId,
    visibility: note.visibility,
    orgId: note.orgId,
  };

  if (!canReadNote(userCtx, orgCtx, noteCtx, note.shares)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const summaries = await db.aISummary.findMany({
    where: { noteId },
    orderBy: { createdAt: "desc" },
  });

  const parsed = summaries.map((s) => {
    let data: unknown = null;
    try {
      data = JSON.parse(s.content);
    } catch {
      data = null;
    }
    return {
      id: s.id,
      noteId: s.noteId,
      model: s.model,
      accepted: s.accepted,
      acceptedAt: s.acceptedAt,
      createdAt: s.createdAt,
      data,
    };
  });

  return NextResponse.json({ success: true, summaries: parsed });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { summaryId, accepted } = await req.json() as { summaryId: string; accepted: boolean };
  const userId = session.user.id;
  const orgId = session.activeOrgId;

  const summary = await db.aISummary.findUnique({
    where: { id: summaryId },
    include: { note: { include: { shares: true } } },
  });

  if (!summary) return NextResponse.json({ error: "Summary not found" }, { status: 404 });

  const membership = await db.orgMember.findUnique({
    where: { orgId_userId: { orgId: orgId!, userId } },
  });
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const canRead = canReadNote(
    { id: userId, email: session.user.email },
    { orgId: orgId!, role: membership.role as Role },
    {
      authorId: summary.note.authorId,
      visibility: summary.note.visibility,
      orgId: summary.note.orgId,
    },
    summary.note.shares
  );
  if (!canRead) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updated = await db.aISummary.update({
    where: { id: summaryId },
    data: { accepted, acceptedAt: accepted ? new Date() : null },
  });

  await writeAuditLog({
    action: "ai.accept",
    userId,
    orgId: orgId!,
    resourceId: summaryId,
    resourceType: "ai_summary",
    metadata: { accepted },
  });

  return NextResponse.json({ success: true, summary: updated });
}
