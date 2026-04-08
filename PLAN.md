# Dev Branch — Completed

All work below was completed on the `dev` branch and merged to `main`.

## What was done

### UI Redesign (Warm Editorial)
- **Design system**: teal accent (`#0B7285`), parchment background (`#F6F3EC`), `Lora` serif for headings
- **Tailwind tokens**: semantic color names (`canvas`, `surface`, `ink`, `dim`, `flame`, etc.) mapped to CSS variables
- **Dark mode**: `ThemeProvider` persists preference to `localStorage`; all components use `dark:` variants
- **Sidebar layout**: shared `(app)/layout.tsx` route group layout renders `AppShell` with persistent sidebar for all app pages — no more per-page nav bars
- **Components**: NoteList, NoteDetail, NoteEditor, OrgSettings, FileUploader, VersionsView, SearchView all redesigned

### Auth: NextAuth → Clerk
- Replaced NextAuth JWT sessions with Clerk
- Email/password + email OTP + Google + Microsoft sign-in out of the box
- Email verification required on signup
- `src/lib/session.ts`: unified session helper — reads Clerk userId, looks up/creates DB user, reads `tn_active_org` cookie
- `src/actions/session.ts`: `switchActiveOrg()` / `clearActiveOrg()` server actions replace NextAuth `update()`
- Catch-all auth routes `[[...login]]` / `[[...register]]` for Clerk's path routing
- `scripts/import-users-to-clerk.ts`: bulk-imports existing DB users into Clerk

### Bug Fixes
- **Remove button visibility**: ADMIN no longer sees Remove on OWNER members
- **`deleteOrg` audit log**: was logging `"org.create"` — corrected to `"org.delete"`
- **`parseInt` NaN**: search route guards against non-numeric limit/offset
- **Header injection**: `Content-Disposition` now uses RFC 5987 encoding
- **Rate limiter memory leak**: purges expired entries on each check
- **VersionsView**: error state + retry, same-version comparison guard
- **File size display**: shows MB for files ≥ 1 MB
- **Production error messages**: server actions return `{ success, error? }` instead of throwing (Next.js strips thrown messages in production)
- **Clerk signup loop**: `(app)/layout.tsx` uses Clerk `auth()` for redirect guard; DB errors show error page instead of redirecting (which caused `history.replaceState` infinite loop)
- **Race condition on first login**: concurrent requests inserting new user → unique constraint — caught and retried
- **`passwordHash NOT NULL`**: schema migration makes it nullable for Clerk-native users
- **stale test assertions**: `permissions.test.ts` updated to match actual behavior

### Infrastructure
- `docker-compose.local.yml`: spins up only Postgres + MinIO for `pnpm dev`
- `docker-compose.yml`: added Clerk env vars
- `prisma/migrations/20260408_add_clerk_id`: adds `clerkId` column, drops `passwordHash NOT NULL`
- `playwright.config.ts` + `tests/e2e/`: auth, dashboard, orgs test suites
- Vitest scoped to `tests/unit/**` only
