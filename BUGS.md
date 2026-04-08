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

## Bug 016: Admin/Owner could edit notes they don't own
**Found:** Live testing — userA (OWNER) could access /notes/[id]/edit for notes they didn't write
**Severity:** Medium — violates spec ("only authors can edit")
**Description:** `canWriteNote` allowed ADMIN/OWNER to edit any note. `canEdit` in the note page was `isAuthor || isAtLeast(role, ADMIN)`. Edit button visible to all.
**Fix:** `canWriteNote` → author-only. `canEdit = isAuthor`. Edit button hidden for non-authors. Edit page redirects non-authors.
**Status:** Fixed

## Bug 017: Prisma connection pool exhaustion in production (random 500s)
**Found:** Railway deployment — intermittent 500 errors on any DB-touching route
**Severity:** High — unpredictable failures in production
**Description:** `db.ts` only persisted the Prisma singleton in development (`if (process.env.NODE_ENV !== "production")`). In production, every request created a new `PrismaClient` + `PrismaPg` adapter + pg connection pool (10 connections each). Railway's Postgres connection limit was hit quickly.
**Fix:** Removed the environment guard — singleton always persisted in `globalForPrisma`.
**Status:** Fixed

## Bug 018: Stale activeOrgId in JWT after leaving/deleting last org
**Found:** Live testing — after leaving or deleting the only org, dashboard showed stale org data or broken state
**Severity:** High — users stuck with invalid session state
**Description:** `session.update({})` (empty payload) triggered the JWT `trigger === "update"` branch only when `session.activeOrgId` was present. With no payload, the condition was false and the old `activeOrgId` was never cleared. Users remained with a stale org in their JWT.
**Fix:** JWT callback now handles `trigger === "update"` with no `activeOrgId` by re-fetching the user's first available org. If none exist, all active org fields are cleared.
**Status:** Fixed

## Bug 019: No-org state forced users to create an org before checking invites
**Found:** UX review — new users and users who left all orgs had no path to their invite inbox
**Severity:** Medium — UX dead end
**Description:** Dashboard no-org state only showed "Create Organization". Users who had been invited couldn't access /invites without knowing the URL.
**Fix:** No-org landing page now prominently shows pending invite count and a "Check Invites" button. Create org is secondary. Sign out always visible.
**Status:** Fixed

## Bug 020: ADMIN sees Remove button on OWNER members
**Found:** Code review
**Severity:** High — incorrect permission display
**Description:** The Remove button was shown to ADMIN users next to OWNER members, even though ADMINs cannot remove OWNERs. Clicking would silently fail.
**Fix:** `canCallerRemove()` helper in OrgSettings checks: OWNER can remove anyone (except self), ADMIN can only remove MEMBERs, MEMBERs can remove no one.
**Status:** Fixed

## Bug 021: deleteOrg audit log recorded wrong action
**Found:** Code review
**Severity:** Low — incorrect audit trail
**Description:** `deleteOrg` server action was logging `action: "org.create"` instead of `"org.delete"` — a copy-paste error.
**Fix:** Changed to `"org.delete"`. Added `"org.delete"` to the `LogAction` type in `logger.ts`.
**Status:** Fixed

## Bug 022: parseInt NaN crashes search route
**Found:** Edge case analysis
**Severity:** Medium — server crash on invalid query params
**Description:** `Math.min(parseInt("abc"), 100)` returns `NaN`, which causes unexpected DB query behavior.
**Fix:** Added `isNaN()` guards: `const limit = Math.min(isNaN(raw) ? 20 : raw, 100)`.
**Status:** Fixed

## Bug 023: Content-Disposition filename injection
**Found:** Security audit
**Severity:** Medium — malformed HTTP headers
**Description:** `Content-Disposition: inline; filename="${file.filename}"` — a filename containing `"` would break the header.
**Fix:** Switched to RFC 5987 encoding: `filename*=UTF-8''${encodeURIComponent(filename)}`.
**Status:** Fixed

## Bug 024: Rate limiter memory leak in AI summarize route
**Found:** Code review
**Severity:** Medium — server memory grows unbounded
**Description:** `rateLimitMap` (Map) never deleted old entries. Over hours/days in production, every user who ever called the AI endpoint would remain in memory.
**Fix:** Added `rateLimitMap.forEach(...)` purge of expired entries at the start of each `checkRateLimit()` call.
**Status:** Fixed

## Bug 025: VersionsView stuck on "Loading..." on error
**Found:** Testing
**Severity:** Medium — UX dead end
**Description:** If `loadVersions()` threw, the `finally` block wasn't reached, leaving `loading` true forever.
**Fix:** Moved `setLoading(false)` to `finally` block; added a visible error state with a Retry button.
**Status:** Fixed

## Bug 026: Clerk signup causes history.replaceState infinite loop
**Found:** Production testing
**Severity:** Critical — app unusable after signup
**Description:** After Clerk signup, `(app)/layout.tsx` called `getSession()` which failed (DB error), caught the error and redirected to `/login`. `/login` saw an active Clerk session and redirected to `/dashboard`. Clerk's client-side code looped 100+ times until browser threw `SecurityError: Attempt to use history.replaceState() more than 100 times`.
**Root causes:**
  1. `passwordHash` was still `NOT NULL` in Docker DB — upsert of new Clerk user (no password) failed
  2. `(app)/layout.tsx` redirected to `/login` on ANY `getSession()` error, not just auth failures
**Fix:** 
  - Migration `20260408_add_clerk_id` drops `NOT NULL` from `passwordHash`
  - Layout now uses Clerk's `auth()` for redirect guard (only redirects on auth failure); DB errors show error page instead
**Status:** Fixed

## Bug 027: Race condition creates duplicate user on first Clerk login
**Found:** Production testing
**Severity:** High — `Unique constraint failed on ("clerkId")`
**Description:** When a new Clerk user first hits the dashboard, multiple parallel server requests all call `getSession()`. Each finds no DB user and tries to INSERT. The first succeeds; the rest fail with unique constraint violation on `clerkId`.
**Fix:** Wrapped upsert in try/catch; on unique constraint error, fetches the already-created row instead of re-throwing.
**Status:** Fixed

## Bug 028: Server action error messages stripped in production
**Found:** Production testing
**Severity:** High — users see generic "An error occurred" instead of actionable messages
**Description:** Next.js strips `Error.message` from server actions in production mode. All `throw new Error("...")` calls in actions were silently becoming `"An error occurred in the Server Components render"` on the client.
**Fix:** Refactored all user-facing org server actions to return `{ success: false, error: string }` instead of throwing. Client components check `result.success` instead of using try/catch. New `Result<T>` type with `ok()` / `err()` helpers.
**Status:** Fixed

## Bug 029: Auth route `/login/factor-one` not found
**Found:** Testing
**Severity:** High — Clerk multi-step flows broken
**Description:** Without catch-all routes, Clerk's path routing would navigate to `/login/factor-one` (for MFA/OTP verification steps) which had no handler.
**Fix:** Converted `/login/page.tsx` → `/login/[[...login]]/page.tsx` and `/register/page.tsx` → `/register/[[...register]]/page.tsx`. Added `routing="path"` with `path="/login"` to the Clerk components.
**Status:** Fixed
