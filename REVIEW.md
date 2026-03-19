# REVIEW.md — Code Review Notes

## What I Reviewed Deeply

### lib/permissions.ts
Most critical file. Reviewed every function against spec:
- `canReadNote`: PRIVATE correctly requires author OR share entry (not role-based)
- `canWriteNote`: ADMIN/OWNER can edit, but not delete (different function)
- `canDeleteNote`: Only author or OWNER — ADMIN cannot delete
- `canReadFile`: Delegates to `canReadNote` when file has note attachment
- All functions check `org.orgId !== note.orgId` as first guard — prevents cross-org access

### src/actions/notes.ts
- Every action calls `getSession()` which throws if no session/no active org
- `orgId` always from session JWT, never from input
- `updateNote` and `deleteNote` load the note from DB, verify org matches session org
- Permission denial writes to AuditLog before throwing

### src/app/api/files/[fileId]/route.ts
- `storageKey` never returned to client
- Response streams the file with `Content-Disposition: inline`
- Permission check before any stream operation
- File's `orgId` checked against user's active org

### migrations/20240101_init/migration.sql
- FTS trigger fires on INSERT OR UPDATE
- `setweight` gives title weight 'A' (higher) and content weight 'B'
- GIN index on `searchVector` for FTS
- trigram extension enabled before trigram index creation

### src/lib/search.ts
- `orgId` parameter sourced from session (caller responsibility, documented)
- Permission filter embedded in SQL WHERE clause: `org_id = $1 AND (visibility IN ('PUBLIC', 'ORG') OR author_id = $2 OR EXISTS (note_shares...))`
- Tag filter uses parameterized `ANY($4::text[])` not string interpolation

## What I Sampled (Not Deep Review)

- UI components: checked for any direct API calls that bypass server action permission checks
- OrgSwitcher: verified it calls `session.update()` not a custom API endpoint
- Seed script: verified batch logic, checked no cross-org data corruption

## What I Distrusted Most

**Raw SQL in search.ts** — SQL injection risk. Verified:
- All parameters use `$N` placeholders
- `orgId` and `userId` are UUIDs from JWT (safe)
- `tsQuery` is built from user input but sanitized: non-alphanumeric characters stripped, then passed as parameter via `$3`
- `tagNames` passed as `$4::text[]` array parameter

**NextAuth session update flow** — Risk: client could forge `activeOrgId` update.
Verified: `jwt` callback re-validates org membership in DB when `trigger === "update"`. If user is not a member of the requested org, the token is not updated.

## Session 3 — Permission model, visibility, auth

### canWriteNote vs canChangeVisibility (permissions.ts)
The original `canWriteNote` allowed ADMIN/OWNER to update any field including `visibility`. An admin editing someone else's PRIVATE note could re-publish it without the author knowing. Fixed by adding `canChangeVisibility` (author-only) and checking it in `updateNote` before applying visibility changes.

### canDeleteNote expanded to ADMIN
Original: OWNER-only for delete. Corrected to `isAtLeast(role, Role.ADMIN)` so both ADMIN and OWNER can delete any note.

### Search role-awareness
`searchNotes` now accepts `role`. Admin/Owner skip the visibility filter entirely (see all). Regular members see ORG + own PRIVATE + shares.

### PUBLIC visibility removed from UI
The app is org-scoped. No endpoint serves notes to unauthenticated users, so PUBLIC was a false expectation. Removed from dropdowns; DB enum kept for backwards compat.

## Session 2 — Post-Deploy Review Findings

### Search (src/lib/search.ts) — CRITICAL BUG FOUND
The raw SQL used snake_case column names (`n.author_id`, `n.org_id`) but Prisma's `@@map` annotation only remaps the table name. Individual columns are created with camelCase names matching the schema field names. The production query failed with `column n.author_id does not exist` on every search request.

**Lesson:** Raw SQL in Prisma projects must use the actual DB column names — verify against the migration SQL, not the Prisma schema field names.

### NoteDetail.tsx — Duplicate Header
FileUploader renders its own "Attachments" `<h3>`. NoteDetail also wrapped it with another `<h3>Attachments</h3>`. Visual bug, easy to miss in code review but immediately obvious in the UI.

### Audit Log Page — ID Truncation
`resourceId.slice(0, 8)` made IDs unverifiable. Changed to show full CUID.

### Org Creation Flow — JWT Not Refreshed
`createOrg()` creates the org in DB but the JWT session still has `activeOrgId=undefined`. The fix (`session.update({ activeOrgId })`) was needed in the page component, not the server action — because the server action can't trigger client-side session updates directly.

### What I'd Review Next With More Time

1. **Integration tests** — The unit tests cover permissions, but integration tests for cross-org search isolation would give more confidence
2. **Rate limiting** — AI summary endpoint has no rate limiting; could be abused
3. **File type validation** — Currently accepts any MIME type; should whitelist
4. **Invite token security** — Using CUID tokens (not cryptographically random); should use `crypto.randomBytes(32).toString('hex')`
5. **Session token expiry** — No explicit maxAge set for JWT; default Next-Auth expiry may be too long
6. **Audit log retention** — No TTL/cleanup policy; table will grow unbounded
7. **Error messages** — Some error messages may leak internal details (e.g., "Note not found" vs "Forbidden" ambiguity for PRIVATE notes)
