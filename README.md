# TeamNotes

Multi-tenant team notes app with full-text search, file attachments, AI summaries, and role-based access control.

## Quick start (Docker)

```bash
docker compose up
```

App: http://localhost:3000  
MinIO console: http://localhost:9001 (minioadmin / minioadmin)

Seed accounts (password: `password123`):
- `user1@example.com` — OWNER of all 3 orgs (Acme Corp, Beta Labs, Gamma Inc)
- `user2@example.com` — ADMIN in Acme and Beta
- `user3–9@example.com` — various MEMBER/ADMIN roles
- `user10@example.com` — no org (demonstrates the empty-state flow)

## ⚠️ Email is a username, not a real email

**No emails are ever sent.** The "email" field is used purely as a unique login identifier — think of it as a username that happens to look like an email address.

This affects:
- **Registration** — any string in email format works (`alice@example.com`, `alice@fake.local`, etc.)
- **Org invites** — invites are delivered in-app at `/invites`, not by email. The inviter shares the link or tells the invitee to check their Invites inbox.
- **Password reset** — not implemented; there is no email delivery.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 App Router |
| Database | PostgreSQL 16 + Prisma 7 |
| Auth | NextAuth.js v5 (JWT, Credentials) |
| Search | PostgreSQL FTS — `tsvector` + GIN index |
| Storage | MinIO (S3-compatible) |
| AI | Groq — `llama-3.3-70b-versatile` |
| Logging | pino + AuditLog DB table |

## Environment variables

See `.env.example`. Required for production:

```
DATABASE_URL
AUTH_SECRET          # openssl rand -base64 32
AUTH_URL             # https://your-app.railway.app
GROQ_API_KEY
STORAGE_ENDPOINT / STORAGE_ACCESS_KEY / STORAGE_SECRET_KEY / STORAGE_BUCKET
```

## Local development (without Docker)

```bash
pnpm install
pnpm db:migrate      # requires DATABASE_URL in .env.local
pnpm db:seed         # loads 10k notes + test accounts
pnpm dev
```

## Key design decisions

- **OrgId always from JWT** — never trusted from the client request body
- **File downloads proxied** — MinIO storage keys never exposed to the browser
- **Visibility**: `ORG` (all members) or `PRIVATE` (author + explicit shares). No public notes.
- **Only authors can change visibility** — admins/owners can edit content but cannot re-publish someone else's private note
- **Invites are in-app only** — see `src/app/(app)/invites/page.tsx`
