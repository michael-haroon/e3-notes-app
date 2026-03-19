# NOTES.md — Agent Build Log

## Session Start

Building a multi-tenant notes app per the AI Agent Take-Home spec. Full plan created before coding.

## Architecture Decisions

**Tech stack selected:**
- Next.js 14 App Router — full-stack RSC, auth enforced at render time
- Prisma 7 + PostgreSQL 16 — type-safe ORM, PG FTS for search at scale
- NextAuth.js v5 (beta) — Credentials provider, JWT strategy
- MinIO (Docker) → S3-compatible, storage key never exposed
- Groq SDK (llama-3.3-70b-versatile) — AI summaries with JSON mode
- pino — structured logging, stdout for Railway + AuditLog DB table
- Vitest — unit + integration tests

**Security decisions:**
- OrgId ALWAYS from JWT session, never from client body
- File storage keys never exposed — all downloads proxied through /api/files/[fileId]
- Audit log writes on every permission denial before throwing
- PRIVATE notes: only author + explicit NoteShare entries can read

## Implementation Order

1. MVP scaffold (Next.js init, Prisma schema, auth, CRUD)
2. Full Prisma schema with FTS trigger + GIN index migration
3. Permission system (lib/permissions.ts) — TDD with unit tests
4. Server actions (notes, orgs, auth) all call permission checks
5. UI pages (dashboard, notes, orgs, search)
6. Feature branches via parallel sub-agents:
   - tags-visibility
   - versioning
   - search
   - files
   - ai-logging
   - seed

## FTS Design

PostgreSQL `tsvector` maintained by SQL trigger (not app code) on INSERT/UPDATE.
GIN index on `searchVector`, trigram index on `title` for partial match.
Search query embeds permission check in SQL — no post-filtering.
Single raw SQL query with org-boundary + visibility/share enforcement in WHERE clause.

## Multi-tenancy

OrgId injected from JWT session via NextAuth callback. Middleware guards all routes.
Org switcher calls `session.update({ activeOrgId })` to switch context.
All server actions verify membership before acting.

## Version Tracking

Auto-version on every note save via `$transaction`. `NoteVersion.version` is explicit integer.
Diff API uses `diff` npm package, returns unified patch format.

## Session 2 — Post-Deploy Review Fixes

**Bugs found in live testing:**
- Duplicate "Attachments" header: NoteDetail wrapped FileUploader with its own h3; FileUploader already has one. Removed outer header.
- Audit log resource ID truncated at 8 chars (cosmetic). Removed `.slice(0, 8)`.
- Search broken: raw SQL used snake_case column names (`n.author_id`) but migration created camelCase columns (`"authorId"`). Fixed in `fix/search-column-names` branch.
- After org creation, JWT still had `activeOrgId=undefined`. Fixed by calling `session.update({ activeOrgId })` in the org creation page.
- NextAuth v5 `UntrustedHost` error in Docker: fixed by `trustHost: true` in auth config + `AUTH_TRUST_HOST=1` in docker-compose.
- Prisma 7 breaking changes: `@prisma/adapter-pg` now required, `node:` protocol imports needed webpack externals, middleware must use edge-safe auth config.

## Session 3 — Permission model revision + auth fixes

**Changes:**
- Removed PUBLIC visibility from UI (it was meaningless in a closed org app; DB enum kept for compat)
- `canReadNote` for PRIVATE: now also allows ADMIN/OWNER (consistent with "admins see all")
- `canChangeVisibility`: new permission, author-only. Admins can edit content but cannot change visibility of notes they don't own
- `canDeleteNote`: expanded to include ADMIN (was OWNER-only before)
- Search (`search.ts`): accepts `role` param; admin/owner skip visibility filter
- Dashboard: admin/owner see all notes including PRIVATE
- Signout: replaced HTML form POST (no CSRF) with `SignOutButton` client component
- Login CSRF: fixed by setting `AUTH_URL` in docker-compose + `trustHost: true` in auth.ts
- Seed: user1 now in all 3 orgs, user10 in no org, audit log events added

## Known Decisions / Trade-offs

- Using raw SQL for search (not Prisma queries) — necessary for tsvector + permission filter in one query
- NextAuth v5 beta — breaking changes from v4, session type augmentation needed
- MinIO for local dev, env-var switchable to AWS S3 for production
- Seed creates 10k notes sequentially (one per loop iteration) — slower but avoids OOM from large Promise.all batches
- Seed file records use placeholder storageKeys — files won't download but metadata exists for review
- Prisma 7 `@@map` only remaps table names; column names stay camelCase as written in schema — raw SQL must use quoted camelCase identifiers

## Seed Data Structure (for review)

| Metric | Value |
|--------|-------|
| Users | 10 (user1-10@example.com / password123) |
| Orgs | 3 (Acme, Beta, Gamma — overlapping membership) |
| Notes | ~10,000 distributed across orgs |
| Visibility split | ~60% ORG, 20% PUBLIC, 20% PRIVATE |
| Notes with 2+ versions | 25% (every 4th) |
| Notes with 3 versions | 5% (every 20th) |
| AI summaries | 5% of notes (every 20th) |
| File records | 2% of notes (every 50th) |
| NoteShare entries | 60+ (PRIVATE notes shared with org members) |
| Tags per org | 8 shared + 2 org-exclusive = 10 |

Login to test as any user: `user1@example.com` / `password123`
