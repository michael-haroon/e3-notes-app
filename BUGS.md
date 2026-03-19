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

## Bug 014: Edit link/page accessible to all authenticated users
**Found:** Live testing — regular members could navigate to /notes/[id]/edit for any note
**Severity:** Medium — data integrity (members could attempt edits on others' notes)
**Description:** NoteDetail showed the Edit link to every user regardless of role/authorship. The edit page itself had no permission check; only the server action blocked saves. Members could see the full edit form for any note.
**Fix:** Edit link now hidden unless `canEdit` (author OR admin/owner). Edit page redirects unauthorized users back to the note view.
**Status:** Fixed

## Bug 010: CSRF MissingCSRF on login — NextAuth v5 container hostname mismatch
**Found:** Live testing in Docker
**Severity:** Critical — login entirely broken
**Description:** NextAuth v5 compares `Origin` header (`localhost:3000`) against the server's detected URL. Inside Docker, the request URL uses the container hostname (e.g. `c97f04328971:3000`), so the origin check always fails → MissingCSRF.
**Fix:** Added `AUTH_URL=http://localhost:3000`, `AUTH_SECRET`, and `AUTH_TRUST_HOST=1` to docker-compose env. Added `trustHost: true` to the full `auth.ts` config (not just `auth.config.ts`).
**Status:** Fixed

## Bug 011: Signout form missing CSRF token
**Found:** Live testing — clicking Sign out redirected to `/login?error=MissingCSRF`
**Severity:** High — signout broken
**Description:** Dashboard used a plain HTML `<form action="/api/auth/signout" method="POST">` with no CSRF token. NextAuth v5 requires a CSRF-signed request for signout.
**Fix:** Replaced with `SignOutButton.tsx` client component that calls `signOut({ callbackUrl: "/login" })` from `next-auth/react`.
**Status:** Fixed

## Bug 012: Admin/Owner could change note visibility they don't own
**Found:** Spec review + logic review
**Severity:** Medium — privacy violation
**Description:** `canWriteNote` allowed ADMIN/OWNER to change any field including `visibility`. An admin editing a private note could silently re-publish it to ORG, making the author unaware.
**Fix:** Added `canChangeVisibility()` in permissions.ts (author-only). `updateNote` action now separately checks this before applying a visibility update.
**Status:** Fixed

## Bug 013: PUBLIC visibility exposed in UI despite app being org-scoped
**Found:** Requirements review
**Severity:** Low — functional, but conceptually wrong
**Description:** Notes could be set to PUBLIC (visible to "anyone"). This app is multi-tenant org-scoped; there is no unauthenticated read endpoint, so PUBLIC was meaningless.
**Fix:** Removed PUBLIC option from NoteEditor and VisibilityEditor dropdowns. Kept in DB enum for backwards compatibility with any existing seed data.
**Status:** Fixed

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

## Bug 015: `Unknown` status for recent note changes
**Found:** Live review of a note
**Severity:** Low - user detail issue
**Description:** For each version (ie. v1, v2,...), the status for them is "Unknown".
**Status:** Not Fixed
