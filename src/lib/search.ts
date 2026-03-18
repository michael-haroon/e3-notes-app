import { db } from "@/lib/db";
import { Visibility } from "@/generated/prisma";

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
  tagNames,
  limit = 20,
  offset = 0,
}: {
  query: string;
  orgId: string;
  userId: string;
  tagNames?: string[];
  limit?: number;
  offset?: number;
}): Promise<{ results: SearchResult[]; total: number }> {
  if (!query.trim() && (!tagNames || tagNames.length === 0)) {
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

  const tagFilter =
    tagNames && tagNames.length > 0
      ? `AND EXISTS (
          SELECT 1 FROM note_tags nt
          JOIN tags t ON t.id = nt.tag_id
          WHERE nt.note_id = n.id AND t.name = ANY($4::text[]) AND t.org_id = $1
        )`
      : "";

  const rankExpr = tsQuery
    ? `ts_rank(n.search_vector, to_tsquery('english', $3))`
    : "1.0";

  const whereClause = tsQuery
    ? `AND n.search_vector @@ to_tsquery('english', $3)`
    : "";

  const params: unknown[] = [orgId, userId];
  if (tsQuery) params.push(tsQuery);
  if (tagNames && tagNames.length > 0) params.push(tagNames);

  const limitParam = `$${params.length + 1}`;
  const offsetParam = `$${params.length + 2}`;
  params.push(limit, offset);

  const sql = `
    SELECT
      n.id,
      n.title,
      n.content,
      n.visibility,
      n.author_id AS "authorId",
      u.name AS "authorName",
      n.org_id AS "orgId",
      n.created_at AS "createdAt",
      n.updated_at AS "updatedAt",
      ${rankExpr} AS rank,
      COALESCE(
        array_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL),
        ARRAY[]::text[]
      ) AS tags
    FROM notes n
    JOIN users u ON u.id = n.author_id
    LEFT JOIN note_tags nt ON nt.note_id = n.id
    LEFT JOIN tags t ON t.id = nt.tag_id
    WHERE
      n.org_id = $1
      AND (
        n.visibility IN ('PUBLIC', 'ORG')
        OR n.author_id = $2
        OR EXISTS (
          SELECT 1 FROM note_shares ns
          WHERE ns.note_id = n.id AND ns.user_id = $2
        )
      )
      ${whereClause}
      ${tagFilter}
    GROUP BY n.id, u.name
    ORDER BY rank DESC, n.updated_at DESC
    LIMIT ${limitParam} OFFSET ${offsetParam}
  `;

  const countSql = `
    SELECT COUNT(DISTINCT n.id) AS total
    FROM notes n
    WHERE
      n.org_id = $1
      AND (
        n.visibility IN ('PUBLIC', 'ORG')
        OR n.author_id = $2
        OR EXISTS (
          SELECT 1 FROM note_shares ns
          WHERE ns.note_id = n.id AND ns.user_id = $2
        )
      )
      ${whereClause}
      ${tagFilter}
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
