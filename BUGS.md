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

## Bug 006: Missing `_prisma_migrations` table insert
**Found:** During migration SQL review
**Severity:** Medium — migrations would reapply on deploy
**Description:** Had manually inserted into `_prisma_migrations` table but the table may not exist yet when migration runs.
**Fix:** Removed the manual INSERT. Prisma creates and manages this table automatically via `migrate deploy`.
**Status:** Fixed
