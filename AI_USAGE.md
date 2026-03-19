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

## Session 2 — Post-Deploy Debugging (Prisma 7 + Docker)

**What the agent got wrong / had to iterate on:**

1. **Prisma 7 webpack incompatibility** — Agent initially just added `serverExternalPackages` to `next.config.mjs` which is a Next.js 15 API. In Next.js 14, the correct key is `experimental.serverComponentsExternalPackages`. Even then, since the Prisma client was generated into `src/generated/prisma` (local code), webpack bundled it and hit `node:crypto` errors. Final fix: webpack externals function for `node:` scheme.

2. **Middleware edge runtime crash** — Agent failed to anticipate that Next.js middleware runs in the Edge runtime, which has no Node.js APIs. Importing `src/lib/auth.ts` (which imports Prisma via `db.ts`) caused `Native module not found: path`. Required splitting into `auth.config.ts` (edge-safe, no DB) + keeping full `auth.ts` for server components. Took 3 attempts.

3. **Prisma 7 constructor requires driver adapter** — Agent initially used `new PrismaClient()` with no args, then tried passing `{ log: [...] }`. Both failed because Prisma 7 mandates either `adapter` or `accelerateUrl`. Required installing `@prisma/adapter-pg` + `pg`.

4. **Docker entrypoint prisma CLI** — First attempt used `npx prisma migrate deploy` which downloaded prisma at runtime but couldn't resolve `prisma/config`. Second attempt used `node_modules/prisma/build/index.js` directly. Final approach: install prisma + @prisma/engines in the runner stage via `pnpm add`.

5. **Raw SQL snake_case vs camelCase** — Agent wrote `n.author_id`, `n.org_id` etc. in the search SQL. Prisma's `@@map` only renames the TABLE, not individual columns. The DB stores them as camelCase (`"authorId"`, `"orgId"`). Complete search failure in production until this was caught by live testing.

6. **NextAuth v5 UntrustedHost** — Agent didn't add `trustHost: true` to the auth config. Required both `trustHost: true` in `authConfig` and `AUTH_TRUST_HOST=1` in docker-compose.

7. **Session JWT not refreshed after org creation** — After `createOrg()`, the JWT still had `activeOrgId=undefined`. Agent had `router.refresh()` but not `session.update({ activeOrgId })`. The dashboard showed "Create your first organization" even though the org existed.

**Approaches that failed:**
- `stash pop` onto commit 1 to apply all fixes at once — caused massive merge conflicts because stash was created from commit 4
- `serverExternalPackages` at top-level in next.config.mjs (Next.js 14 only supports it under `experimental`)
- `sed` to edit files with multiline content — inserted literal `\n` characters instead of newlines
- `printf` with `!` in shebang — zsh history expansion mangled the `#!/bin/sh` to `#\!/bin/sh`

**What I'd trust agents with vs. not:**
- Trust: boilerplate CRUD, UI components, migration SQL structure
- Don't trust: framework-version-specific config (always verify against changelogs), raw SQL with ORM-generated schemas, edge vs. server runtime boundaries

## Sessions 3–5 — Iterative live review + production fixes

**What went wrong and required correction:**

1. **Permission model drift** — Agent initially allowed admin/owner to edit others' notes ("CRUD for admins"). User clarified: admin/owner can view + delete only; only authors edit. Took two correction cycles to get right (`canWriteNote` was fixed twice).

2. **Production DB connection exhaustion** — The Prisma singleton guard `if (process.env.NODE_ENV !== "production")` was written that way intentionally to avoid Next.js hot-reload issues in dev, but nobody caught that it meant zero pooling in production. Surfaced only under live Railway traffic.

3. **JWT not clearing on org leave** — `session.update({})` pattern reused from invite acceptance. The JWT callback only acted when `session.activeOrgId` was present in the payload. Empty update did nothing. Not caught because local testing always had a fallback org.

4. **Invite email matched non-existent users** — Initial `inviteMember` accepted any email format without checking if a user account existed. User discovered this live.

**What was built across these sessions without major issues:**
- Org leave/delete with last-owner protection
- Invite decline (server-side delete)
- SharePanel for PRIVATE notes (author-only)
- Remove member (admin/owner)
- No-org landing page with invite inbox shortcut
