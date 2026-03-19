import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { searchNotes } from "@/lib/search";
import { writeAuditLog } from "@/lib/audit";
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

  const url = new URL(req.url);
  const query = url.searchParams.get("q") ?? "";
  const tags = url.searchParams.getAll("tag");
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20"), 100);
  const offset = Math.max(parseInt(url.searchParams.get("offset") ?? "0"), 0);

  const { results, total } = await searchNotes({
    query,
    orgId,
    userId: session.user.id,
    role: (session.activeOrgRole ?? "MEMBER") as Role,
    tagNames: tags.length > 0 ? tags : undefined,
    limit,
    offset,
  });

  await writeAuditLog({
    action: "search.query",
    userId: session.user.id,
    orgId,
    metadata: { query, tags, total },
  });

  return NextResponse.json({ results, total, limit, offset });
}
