# BUGS.md — Bugs Found During Review

## Bug 001: Trigram index before extension
**Found:** During migration review
**Severity:** Critical — migration would fail
**Description:** `notes_title_trgm_idx` using `gin_trgm_ops` was created before `CREATE EXTENSION pg_trgm`, causing a syntax error.
**Fix:** Moved `CREATE EXTENSION IF NOT EXISTS pg_trgm` to the top of migration.sql, before any table definitions.
**Status:** Fixed

## Bug 002: NextAuth v5 session type augmentation missing
**Found:** TypeScript build errors
**Severity:** High — TypeScript compilation failure
**Description:** NextAuth v5 requires explicit `declare module "next-auth"` to add custom session fields. Without it, `session.activeOrgId` etc. would be `unknown`.
**Fix:** Added type augmentation block at the bottom of `src/lib/auth.ts`.
**Status:** Fixed

## Bug 003: OrgId from client body in search
**Potential:** Initial search implementation could have used `req.body.orgId` from client
**Severity:** Critical — tenant isolation bypass
**Description:** If orgId came from client body in search, any user could query any org's notes.
**Fix:** Search API at `/api/search/route.ts` reads `orgId` exclusively from `session.activeOrgId` (JWT-verified).
**Status:** Prevented by design, verified in code

## Bug 004: File storageKey exposure
**Potential:** File download could redirect to MinIO URL
**Severity:** High — private files would be accessible without permission
**Description:** MinIO bucket URLs should never be exposed. Returning a redirect to `http://minio:9000/...` bypasses auth.
**Fix:** `/api/files/[fileId]/route.ts` proxies the stream through Next.js, permission check happens before streaming.
**Status:** Prevented by design, verified in code

## Bug 005: ADMIN/OWNER reading PRIVATE notes
**Found:** During permission logic review
**Severity:** High — user expectation violation, spec says only author + shares
**Description:** Initial intuition was that ADMIN/OWNER could read all notes including PRIVATE. Spec says PRIVATE = author or NoteShare only.
**Fix:** `canReadNote` for PRIVATE notes only checks `authorId === user.id` OR share entry exists. Role is not checked.
**Status:** Correctly implemented, tested in permissions.test.ts

## Bug 007: Duplicate "Attachments" header on note detail page
**Found:** Live review of note detail page
**Severity:** Low — visual defect
**Description:** `NoteDetail.tsx` wrapped `<FileUploader>` with its own `<h3>Attachments</h3>`. `FileUploader` already renders its own "Attachments" heading, producing two headers stacked.
**Fix:** Removed the outer `<h3>` from `NoteDetail.tsx` (commit: see main history).
**Status:** Fixed

## Bug 008: Audit log resource ID truncated to 8 chars
**Found:** Live review of audit log page
**Severity:** Low — usability issue
**Description:** `audit/page.tsx` rendered `{log.resourceId.slice(0, 8)}…` making IDs unverifiable.
**Fix:** Removed the slice, showing the full CUID. IDs are ~25 chars and readable in monospace.
**Status:** Fixed

## Bug 009: Search raw SQL uses snake_case column names, actual DB has camelCase
**Found:** Live search test (500 error from PostgreSQL)
**Severity:** Critical — search entirely broken
**Description:** `src/lib/search.ts` raw SQL used `n.author_id`, `n.org_id`, `n.created_at`, etc. The Prisma migration creates columns as camelCase (`"authorId"`, `"orgId"`, `"createdAt"`) because Prisma's `@@map` only remaps the table name, not individual column names. PostgreSQL is case-sensitive with unquoted identifiers.
**Fix:** All snake_case column refs replaced with double-quoted camelCase: `n."authorId"`, `n."orgId"`, `nt."noteId"`, `ns."userId"`, etc. (see fix/search-column-names branch).
**Status:** Fixed (separate branch, rebased onto main)

## Bug 006: Missing `_prisma_migrations` table insert
**Found:** During migration SQL review
**Severity:** Medium — migrations would reapply on deploy
**Description:** Had manually inserted into `_prisma_migrations` table but the table may not exist yet when migration runs.
**Fix:** Removed the manual INSERT. Prisma creates and manages this table automatically via `migrate deploy`.
**Status:** Fixed
