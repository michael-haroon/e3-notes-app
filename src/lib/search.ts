import { db } from "@/lib/db";
import { Visibility, Role } from "@/generated/prisma/enums";
import { isAtLeast } from "@/lib/permissions";

export type SearchResult = {
  id: string;
  title: string;
  content: string;
  visibility: Visibility;
  authorId: string;
  authorName: string | null;
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  rank: number;
};

/**
 * Full-text search with org-boundary + permission enforcement in SQL.
 * Uses PG tsvector GIN index for performance at scale.
 * OrgId comes from the verified JWT session — never from client input.
 */
export async function searchNotes({
  query,
  orgId,
  userId,
  role = Role.MEMBER,
  tagNames,
  visibilities,
  authorIds,
  limit = 20,
  offset = 0,
}: {
  query: string;
  orgId: string;
  userId: string;
  role?: Role;
  tagNames?: string[];
  visibilities?: Visibility[];
  authorIds?: string[];
  limit?: number;
  offset?: number;
}): Promise<{ results: SearchResult[]; total: number }> {
  if (
    !query.trim() &&
    (!tagNames || tagNames.length === 0) &&
    (!visibilities || visibilities.length === 0) &&
    (!authorIds || authorIds.length === 0)
  ) {
    return { results: [], total: 0 };
  }

  // Build tsquery from search terms
  const tsQuery = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, "") + ":*")
    .filter(Boolean)
    .join(" & ");

  // NOTE: Prisma migration creates camelCase column names (@@map remaps table only).
  // All column refs in raw SQL must use double-quoted camelCase identifiers.
  const hasTags = !!tagNames && tagNames.length > 0;
  const hasVisibilities = !!visibilities && visibilities.length > 0;
  const hasAuthors = !!authorIds && authorIds.length > 0;

  const tagParamIndex = hasTags ? 4 : null;
  const visibilityParamIndex = hasVisibilities ? 4 + (hasTags ? 1 : 0) : null;
  const authorParamIndex = hasAuthors ? 4 + (hasTags ? 1 : 0) + (hasVisibilities ? 1 : 0) : null;

  const tagFilter =
    hasTags && tagParamIndex
      ? `AND EXISTS (
          SELECT 1 FROM note_tags nt2
          JOIN tags t2 ON t2.id = nt2."tagId"
          WHERE nt2."noteId" = n.id AND t2.name = ANY($${tagParamIndex}::text[]) AND t2."orgId" = $1
        )`
      : "";

  const visibilityFilter =
    hasVisibilities && visibilityParamIndex
      ? `AND n.visibility = ANY($${visibilityParamIndex}::"Visibility"[])`
      : "";

  const authorFilter =
    hasAuthors && authorParamIndex
      ? `AND n."authorId" = ANY($${authorParamIndex}::text[])`
      : "";

  const rankExpr = tsQuery
    ? `ts_rank(n."searchVector", to_tsquery('english', $3))`
    : "1.0";

  const whereClause = tsQuery
    ? `AND n."searchVector" @@ to_tsquery('english', $3)`
    : "";

  // Admin/Owner can see all notes in the org; members see ORG + own PRIVATE + shared
  const isPrivileged = isAtLeast(role, Role.ADMIN);
  // $2 must always be referenced; for privileged users the clause is always true
  const visibilityClause = isPrivileged
    ? `($2::text IS NOT NULL)` // always true; keeps $2 bound for pg driver
    : `(n.visibility = 'ORG' OR n."authorId" = $2 OR EXISTS (
        SELECT 1 FROM note_shares ns WHERE ns."noteId" = n.id AND ns."userId" = $2
      ))`;

  const params: unknown[] = [orgId, userId];
  if (tsQuery) params.push(tsQuery);
  if (hasTags) params.push(tagNames);
  if (hasVisibilities) params.push(visibilities);
  if (hasAuthors) params.push(authorIds);

  const limitParam = `$${params.length + 1}`;
  const offsetParam = `$${params.length + 2}`;
  params.push(limit, offset);

  const sql = `
    SELECT
      n.id,
      n.title,
      n.content,
      n.visibility,
      n."authorId",
      u.name AS "authorName",
      n."orgId",
      n."createdAt",
      n."updatedAt",
      ${rankExpr} AS rank,
      COALESCE(
        array_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL),
        ARRAY[]::text[]
      ) AS tags
    FROM notes n
    JOIN users u ON u.id = n."authorId"
    LEFT JOIN note_tags nt ON nt."noteId" = n.id
    LEFT JOIN tags t ON t.id = nt."tagId"
    WHERE
      n."orgId" = $1
      AND ${visibilityClause}
      ${whereClause}
      ${tagFilter}
      ${visibilityFilter}
      ${authorFilter}
    GROUP BY n.id, n."authorId", n."orgId", n."createdAt", n."updatedAt", u.name
    ORDER BY rank DESC, n."updatedAt" DESC
    LIMIT ${limitParam} OFFSET ${offsetParam}
  `;

  const countSql = `
    SELECT COUNT(DISTINCT n.id) AS total
    FROM notes n
    WHERE
      n."orgId" = $1
      AND ${visibilityClause}
      ${whereClause}
      ${tagFilter}
      ${visibilityFilter}
      ${authorFilter}
  `;

  const countParams = params.slice(0, params.length - 2);

  const [rows, countRows] = await Promise.all([
    db.$queryRawUnsafe<SearchResult[]>(sql, ...params),
    db.$queryRawUnsafe<[{ total: string }]>(countSql, ...countParams),
  ]);

  return {
    results: rows,
    total: parseInt(countRows[0]?.total ?? "0"),
  };
}
