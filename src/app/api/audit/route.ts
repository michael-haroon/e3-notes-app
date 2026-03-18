// GET /api/audit?limit=50&offset=0
// orgId from session.activeOrgId
// Requires ADMIN or OWNER role
// Returns: id, action, userId, user.email, resourceType, resourceId, metadata, createdAt
// Ordered by createdAt desc

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAtLeast } from "@/lib/permissions";
import { Role } from "@/generated/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
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
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  if (!isAtLeast(membership.role as Role, Role.ADMIN)) {
    return NextResponse.json({ error: "Forbidden: ADMIN or OWNER role required" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      select: {
        id: true,
        action: true,
        userId: true,
        user: {
          select: { email: true },
        },
        resourceType: true,
        resourceId: true,
        metadata: true,
        createdAt: true,
      },
    }),
    db.auditLog.count({ where: { orgId } }),
  ]);

  return NextResponse.json({ success: true, logs, total, limit, offset });
}
