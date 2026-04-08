# TeamNotes

Multi-tenant team notes app with full-text search, file attachments, AI summaries, role-based access control, dark mode, and Clerk authentication (email/password, email OTP, Google, Microsoft).

## Visit the app
https://e3-notes-app-production.up.railway.app/dashboard

## Quick start (Docker)

```bash
cp .env.example .env
# Fill in CLERK_SECRET_KEY and NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
docker compose up
```

App: http://localhost:3000  
MinIO console: http://localhost:9001 (minioadmin / minioadmin)

> **First run:** After Docker is up, seed the DB and import accounts to Clerk:
> ```bash
> DATABASE_URL="postgresql://postgres:postgres@localhost:5432/notesapp" pnpm db:seed
> DATABASE_URL="postgresql://postgres:postgres@localhost:5432/notesapp" \
> CLERK_SECRET_KEY="sk_test_..." \
> npx tsx scripts/import-users-to-clerk.ts
> ```

Seed accounts (password: `password123`):
- `user1@example.com` — OWNER of Acme Corp, Beta Labs, Gamma Inc
- `user2@example.com` — ADMIN in Acme and Beta
- `user3–9@example.com` — various MEMBER/ADMIN roles
- `user10@example.com` — no org (demonstrates empty-state flow)

## Local development (without Docker)

```bash
pnpm install
docker-compose -f docker-compose.local.yml up -d   # Postgres + MinIO only
pnpm db:push                                        # apply schema
pnpm db:seed                                        # load test data
pnpm dev
```

Requires `.env.local` — copy from `.env.example` and fill in values.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 App Router |
| Database | PostgreSQL 16 + Prisma 7 |
| Auth | Clerk (email/password, OTP, Google, Microsoft) |
| Search | PostgreSQL FTS — `tsvector` + GIN index |
| Storage | MinIO (S3-compatible) |
| AI | Groq — `llama-3.3-70b-versatile` |
| Logging | pino + AuditLog DB table |
| Styling | Tailwind CSS with dark mode |

## Environment variables

See `.env.example`. Required:

```
DATABASE_URL
CLERK_SECRET_KEY                           # from dashboard.clerk.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/register
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
GROQ_API_KEY
STORAGE_ENDPOINT / STORAGE_ACCESS_KEY / STORAGE_SECRET_KEY / STORAGE_BUCKET
```

## Authentication

Authentication is handled by **Clerk**. Users can sign in with:
- Email + password
- Email OTP (one-time code)
- Google or Microsoft (OAuth)

**Registration** requires email verification — Clerk sends a 6-digit code.

**Existing DB users** (e.g. seeded accounts) are linked to Clerk by email on first login. Use the `scripts/import-users-to-clerk.ts` script to pre-create them in bulk.

> **Note:** There is no password reset UI in the app — use Clerk's "Forgot password?" link on the login page.

## How to use the app

### Authentication

**Signing in**
1. Visit http://localhost:3000 → redirects to `/login`
2. Enter email + password, or click "Sign in with Google/Microsoft"
3. Redirected to dashboard on success

**Registering**
1. Navigate to `/register`
2. Fill in username, email, and password
3. Enter the 6-digit verification code sent to your email
4. Automatically signed in and redirected to dashboard

**Signing out**
- Click "Sign out" in the sidebar (bottom-left)

### Navigation

The app uses a **persistent sidebar** with:
- **Notes** — your org's notes
- **Search** — full-text search across the org
- **Invites** — pending org invitations (with badge count)
- **Org Settings** — member management
- **Audit Log** — activity history (ADMIN/OWNER only)
- **New Note** — quick shortcut
- **Theme toggle** — switch between light and dark mode
- **Sign out** button

### Organizations

**Creating an organization**
1. From the no-org screen, click "Create organization"
2. Enter an organization name (minimum 2 characters)
3. You become the OWNER automatically

**Switching organizations**
- Use the org switcher dropdown in the sidebar

**Inviting members**
1. Go to Org Settings (`/orgs`)
2. Enter the invitee's email and select a role
3. The invitee must already have a registered account
4. They'll see the invite in their **Invites inbox** (`/invites`)
5. Invites expire after 7 days

**Roles and permissions**

| Action | MEMBER | ADMIN | OWNER |
|--------|--------|-------|-------|
| View ORG notes | ✅ | ✅ | ✅ |
| View PRIVATE notes (others') | ❌ | ✅ | ✅ |
| Create / edit own notes | ✅ | ✅ | ✅ |
| Edit others' notes | ❌ | ❌ | ❌ |
| Delete any note | ❌ | ✅ | ✅ |
| Invite members | ❌ | ✅ | ✅ |
| Remove members | ❌ | ✅ (MEMBERs only) | ✅ |
| Change roles | ❌ | MEMBER only | Any role |
| View audit log | ❌ | ✅ | ✅ |
| Delete org | ❌ | ❌ | ✅ |

> **Note:** ADMIN cannot remove OWNER members and cannot see a Remove button next to them.

### Notes

**Creating a note**
1. Click "New Note" in sidebar or dashboard
2. Enter title and content
3. Set visibility: **Org** (all members) or **Private** (author + explicit shares)
4. Optionally add tags and attach files

**Note versions**
- Every save creates a new version
- View history via the "History" button on the note page
- Compare any two versions with the diff viewer
- Restore to any previous version

**AI Summary**
- Click "AI Summary" on any note
- Powered by Groq (`llama-3.3-70b-versatile`)
- Rate limit: 10 per hour per user
- Accept or dismiss the generated summary

### File Attachments

- Upload from the note detail or edit page (drag & drop supported)
- Max 50 MB per file
- Downloads are proxied through the API — MinIO URLs never exposed
- File access follows note permissions

### Search

- Full-text search across all notes in the active org
- Filter by tags
- Scope follows your role (MEMBERs see their accessible notes only)

### Audit Log

Available to ADMIN and OWNER at `/audit`. Logs:
- Auth events (register, login, failed logins)
- Org events (invite, join, role change, member removal, deletion)
- Note events (create, update, delete, permission denied)
- AI events (summarize, accept)
- Search queries

## Key design decisions

- **OrgId from session cookie, never client** — tenant isolation cannot be bypassed
- **File downloads proxied** — MinIO keys never exposed
- **Author-only edits** — ADMIN/OWNER can delete notes but cannot edit others' content
- **Invites are in-app** — no email delivery; invites show in `/invites`
- **Server actions return errors** — `{ success: false, error: string }` instead of throwing, so error messages survive Next.js production mode

## Deployment (Railway)

1. Push `main` to Railway (auto-deploys via `docker-entrypoint.sh`)
2. Set env vars in Railway dashboard (see above)
3. Use **production Clerk keys** (`pk_live_` / `sk_live_`)
4. Add your Railway domain to Clerk → Domains
5. Run the import script against Railway's Postgres to pre-create seed accounts:
   ```bash
   DATABASE_URL="postgresql://..." CLERK_SECRET_KEY="sk_live_..." \
   npx tsx scripts/import-users-to-clerk.ts
   ```
