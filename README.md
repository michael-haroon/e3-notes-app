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

## How to use the app

### Authentication

**Logging in**
1. Visit http://localhost:3000
2. Click "Sign In" or navigate to `/login`
3. Enter your email and password
4. Upon successful login, you'll be redirected to the dashboard (or org creation if you have no orgs)

**Registering**
1. Click "Register" or navigate to `/register`
2. Enter your name, email, and password
3. Remember: "email" is just a username — no real emails are sent

**Logging out**
- Click the "Sign Out" button in the top navigation bar
- Available on all pages once logged in

### Organizations

**Creating an organization**
1. From the no-org screen, click "Create a new organization"
2. Or navigate to `/orgs/new` when logged in
3. Enter an organization name
4. You become the **OWNER** automatically
5. A unique slug is generated (e.g., `acme-corp-a3f9b2`)

**Viewing organizations**
- Switch between your orgs using the **org switcher** dropdown in the top-left of the dashboard
- Access org settings via "Org Settings" link in the navigation
- Each org has its own isolated notes, members, and audit log

**Leaving an organization**
- Go to `/orgs` (Org Settings)
- Click "Leave Organization"
- Note: If you're the last OWNER, you must transfer ownership or delete the org first

**Deleting an organization** (OWNER only)
- Go to `/orgs` (Org Settings)
- Scroll to the danger zone
- Click "Delete Organization"
- This permanently deletes all notes, files, and memberships

### Invitations

**Who can invite members**
- **ADMIN** and **OWNER** roles can invite new members
- **MEMBER** role cannot invite

**How to invite someone**
1. Go to `/orgs` (Org Settings)
2. In the "Invite New Member" section, enter the invitee's email
3. Select their role: MEMBER, ADMIN, or OWNER (only OWNERs can assign ADMIN/OWNER roles)
4. Click "Send Invite"
5. The invitee must already have a registered account — otherwise you'll get an error
6. Invites expire after 7 days

**Who can accept invites**
- Any registered user whose email matches the invite
- Invites are not sent via email — they appear in the recipient's **Invites inbox** at `/invites`

**Accepting an invite**
1. Log in to your account
2. Navigate to `/invites` (or click the "Invites" link in the nav bar)
3. You'll see pending invites with org name, role, and expiration date
4. Click "Accept" to join the organization
5. You'll automatically switch to that org

**Joining organizations**
- You can **only** join an org via invitation
- There is no public org directory or self-signup

### Roles and permissions

There are three roles: **MEMBER**, **ADMIN**, **OWNER** (in ascending privilege order).

| Action | MEMBER | ADMIN | OWNER |
|--------|--------|-------|-------|
| View ORG-visible notes | ✅ | ✅ | ✅ |
| View all notes (including others' PRIVATE) | ❌ | ✅ | ✅ |
| Create notes | ✅ | ✅ | ✅ |
| Edit own notes | ✅ | ✅ | ✅ |
| Edit others' notes | ❌ | ❌ | ❌ |
| Delete own notes | ✅ | ✅ | ✅ |
| Delete any note | ❌ | ✅ | ✅ |
| Change own note visibility | ✅ | ✅ | ✅ |
| Change others' note visibility | ❌ | ❌ | ❌ |
| Invite members | ❌ | ✅ | ✅ |
| Change member role to MEMBER | ❌ | ✅ | ✅ |
| Change member role to ADMIN/OWNER | ❌ | ❌ | ✅ |
| Remove members | ❌ | ✅ | ✅ |
| Leave org | ✅ | ✅ | ✅* |
| View audit log | ❌ | ✅ | ✅ |
| Delete org | ❌ | ❌ | ✅ |

\* Last OWNER cannot leave without transferring ownership first

### Notes

**Creating a note**
1. Click "New Note" button on the dashboard or navigate to `/notes/new`
2. Enter a title and content (Markdown supported)
3. Set visibility: **ORG** (all members) or **PRIVATE** (you + explicit shares)
4. Optionally attach files (see File Attachments below)
5. Click "Save"

**Editing a note**
- Only the **original author** can edit note content, title, and tags
- ADMIN/OWNER can delete but cannot edit others' notes
- Click on any note to view, then click "Edit" if you're the author

**Note visibility**
- **ORG**: Visible to all members of the organization
- **PRIVATE**: Visible only to the author, explicitly shared users, and ADMIN/OWNER
- Only the author can change a note's visibility

**Sharing PRIVATE notes**
- Private notes can be explicitly shared with specific users
- Even MEMBERs can view shared private notes if explicitly granted access
- ADMIN/OWNER always have access to all notes (including PRIVATE)

**Viewing notes**
- Dashboard shows recent notes you have access to
- ORG notes: visible to everyone
- PRIVATE notes: only visible if you're the author, a share recipient, or ADMIN/OWNER

**Deleting notes**
- Authors can delete their own notes
- ADMIN and OWNER can delete any note in the org

**Note versions**
- Every edit creates a new version
- View version history on the note detail page
- Versions are read-only snapshots

### File Attachments

**Uploading files**
1. When creating or editing a note, use the file uploader
2. Select files from your computer
3. Files are stored in MinIO (S3-compatible storage)
4. Supported: any file type (images, PDFs, documents, etc.)

**Downloading files**
- Click on the file name/link in a note
- Downloads are proxied through the API — MinIO storage keys are never exposed to the browser
- You must have permission to view the note to download its files

**File permissions**
- File access follows the same rules as note visibility
- If you can view the note, you can download its files

### Search

**Full-text search**
1. Click "Search" in the navigation or go to `/search`
2. Enter your search query
3. Results are ranked by relevance using PostgreSQL full-text search (GIN index on `tsvector`)
4. Search covers note titles and content
5. Only returns notes you have permission to view

**Search scope**
- Searches within your currently active organization
- MEMBER: searches ORG notes + own PRIVATE notes + explicitly shared notes
- ADMIN/OWNER: searches all notes in the org

### AI Summaries

**Generating a summary**
1. Open any note you have access to
2. Click "Generate AI Summary" button
3. The app uses Groq's `llama-3.3-70b-versatile` model
4. Summary includes key points extracted from the note
5. Rate limit: **10 summaries per hour per user**

**Viewing summaries**
- Summaries appear on the note detail page
- Multiple summaries can exist per note (e.g., after edits)
- Summaries show creation timestamp and model used

**Accepting summaries**
- Mark a summary as "accepted" if you find it useful
- Tracked in audit log for transparency

### Audit Logs

**Who can view audit logs**
- **ADMIN** and **OWNER** roles only
- Navigate to `/audit` or click "View Audit Log" from Org Settings

**What's logged**
- Authentication: register, login, logout, failed logins
- Organizations: create, invite, join, role changes, member removal
- Notes: create, read, update, delete, permission denied
- AI: summarize requests, summary acceptance, permission denied
- Search: query execution

**Audit log details**
- Timestamp (ISO 8601 format)
- Action type (color-coded badge)
- User who performed the action
- Resource type and ID
- Shows last 100 events per organization

### Organization Settings

**Accessing settings**
- Click "Org Settings" in the top navigation
- Or navigate to `/orgs`

**What you can do**
- View all members with their roles and join dates
- Invite new members (ADMIN/OWNER only)
- Change member roles (OWNER can assign any role; ADMIN can assign MEMBER)
- Remove members (ADMIN/OWNER only)
- View pending invites
- Leave the organization
- Delete the organization (OWNER only)
- Access audit log link (ADMIN/OWNER only)

## Key design decisions

- **OrgId always from JWT** — never trusted from the client request body
- **File downloads proxied** — MinIO storage keys never exposed to the browser
- **Visibility**: `ORG` (all members) or `PRIVATE` (author + explicit shares). No public notes.
- **Only authors can change visibility** — admins/owners can edit content but cannot re-publish someone else's private note
- **Invites are in-app only** — see `src/app/(app)/invites/page.tsx`
