import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

export async function GET() {
  let session;
  try {
    session = await getSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = session.activeOrgId;
  if (!orgId) return NextResponse.json({ error: "No active org" }, { status: 400 });

  const tags = await db.tag.findMany({
    where: { orgId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ tags });
}

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await getSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = session.activeOrgId;
  if (!orgId) return NextResponse.json({ error: "No active org" }, { status: 400 });

  const { name } = await req.json() as { name: string };
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const membership = await db.orgMember.findUnique({
    where: { orgId_userId: { orgId, userId: session.user.id } },
  });
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const tag = await db.tag.upsert({
    where: { orgId_name: { orgId, name: name.toLowerCase().trim() } },
    create: { name: name.toLowerCase().trim(), orgId },
    update: {},
  });

  return NextResponse.json({ tag }, { status: 201 });
}
