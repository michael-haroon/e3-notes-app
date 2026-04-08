import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { searchNotes } from "@/lib/search";
import { writeAuditLog } from "@/lib/audit";
import { Role, Visibility } from "@/generated/prisma/enums";

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

  const url = new URL(req.url);
  const query = url.searchParams.get("q") ?? "";
  const tags = url.searchParams.getAll("tag");
  const visibilities = url.searchParams
    .getAll("visibility")
    .filter((value): value is Visibility => Object.values(Visibility).includes(value as Visibility));
  const authorIds = url.searchParams.getAll("authorId").filter(Boolean);
  const rawLimit = parseInt(url.searchParams.get("limit") ?? "20");
  const rawOffset = parseInt(url.searchParams.get("offset") ?? "0");
  const limit = Math.min(isNaN(rawLimit) ? 20 : rawLimit, 100);
  const offset = Math.max(isNaN(rawOffset) ? 0 : rawOffset, 0);

  const { results, total } = await searchNotes({
    query,
    orgId,
    userId: session.user.id,
    role: (session.activeOrgRole ?? "MEMBER") as Role,
    tagNames: tags.length > 0 ? tags : undefined,
    visibilities: visibilities.length > 0 ? visibilities : undefined,
    authorIds: authorIds.length > 0 ? authorIds : undefined,
    limit,
    offset,
  });

  await writeAuditLog({
    action: "search.query",
    userId: session.user.id,
    orgId,
    metadata: { query, tags, visibilities, authorIds, total },
  });

  return NextResponse.json({ results, total, limit, offset });
}
