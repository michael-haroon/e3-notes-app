# AI_USAGE.md — Agent Usage Log

## Agents Used

**Primary agent (Claude Code / Claude Sonnet 4.6):**
- Built the full MVP scaffold
- Designed and implemented all architecture decisions
- Wrote all Prisma schema, migrations, server actions, API routes, UI
- Wrote unit tests for permissions.ts (TDD approach)
- Created Docker/Railway deployment config

**Parallel sub-agents (Claude Sonnet 4.6 with worktree isolation):**
- `feature/tags-visibility` — tag CRUD, visibility controls, NoteShare
- `feature/versioning` — auto-versioning, diff viewer
- `feature/search` — PG FTS search page, tag filters
- `feature/files` — MinIO upload/download, permission-gated proxy
- `feature/ai-logging` — Groq AI summaries, pino logging, audit log writes
- `feature/seed` — 10k note seed script

## Work Split

The main agent built the foundation that all parallel agents depend on:
- Complete Prisma schema (all models, indexes, FTS trigger)
- `lib/permissions.ts` — canonical RBAC (all other code calls these)
- Auth system (NextAuth + session)
- Core server actions with permission checks

Sub-agents received clear prompts with:
- The existing schema + permission functions
- Exact file paths to create/modify
- Permission rules to enforce

## What Ran in Parallel

Six feature branches ran simultaneously after MVP commit:
- Each got an isolated git worktree
- No inter-branch dependencies
- Merged into main after all completed

## Where Agents Were Wrong / Corrected

- Initial Prisma schema used `prisma-client-js` generator (Prisma v4 style) — corrected to `prisma-client` (Prisma 7)
- Trigram index was placed before `CREATE EXTENSION pg_trgm` — reordered
- Auth session type augmentation required manual `declare module` block
- NextAuth v5 `signIn` from server actions has different redirect behavior than v4

## What I Don't Trust Agents To Do

- Verify security properties of generated permission logic without review
- Get cross-cutting concerns right without explicit specification (e.g., "orgId from JWT" must be stated explicitly)
- Produce correct raw SQL with edge cases without testing

## Manual Interventions

- Reviewed all permission checks in server actions against spec
- Verified FTS trigger handles both INSERT and UPDATE
- Confirmed file download proxy never exposes storageKey
- Checked audit log writes on permission denials
