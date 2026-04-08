# Dev Branch Improvement Plan

## Goals
Improve the TeamNotes app with better UI, dark/light mode, structured error handling, and edge case fixes — all on the `dev` branch. Main branch must not be touched, and Railway containerization must not be broken.

## Tracks

### 1. Dark/Light Mode Toggle
- Enable `darkMode: 'class'` in `tailwind.config.ts`
- Create `ThemeProvider` (client component, reads/writes localStorage)
- Create `ThemeToggle` button component
- Wrap `layout.tsx` with ThemeProvider, suppress hydration mismatch
- Update all components to use `dark:` variants

### 2. Edge Case: Remove Button Visibility
**Bug:** ADMIN can see "Remove" on OWNER members (they shouldn't be able to remove OWNERs)
- Fix: show Remove button only when caller has permission to remove that specific member
  - OWNER can remove anyone (except self if last owner)
  - ADMIN can only remove MEMBERs and ADMINs (not OWNERs)
  - MEMBER can only remove self (leave)

### 3. Structured Error Handling
- Create `src/lib/errors.ts` with typed AppError class
- All server actions return `{ success, data?, error? }` union instead of throwing
- Frontend components consume `.error` field instead of catching in try/catch
- Surface meaningful messages: "This user is not registered" instead of generic errors

### 4. UI Polish
- Better nav: cleaner layout, user avatar/initials dropdown
- Better spacing throughout (8px grid)
- Card components: shadows, hover states
- Loading skeletons for async data
- Better empty states with icons
- Better forms: validation feedback inline, not just on submit
- Toast/notification system for success feedback

### 5. Local Development Setup
- Create `docker-compose.local.yml` with `NODE_ENV=development`, hot-reload volume mount
- Create `.env.example` with all required vars documented
- Development uses local Next.js dev server, only deps (postgres + minio) in Docker

### 6. Form Validation Improvements
- Client-side validation before API calls
- Min/max length feedback
- Email format validation with clear messaging
- Disabled states while submitting

### 7. Additional Tests
- Unit tests for new error handling utilities
- Playwright e2e tests for key flows: login, create note, invite member, remove member

## Files to Change
- `tailwind.config.ts` — add darkMode
- `src/app/globals.css` — dark mode CSS vars
- `src/app/layout.tsx` — add ThemeProvider
- `src/providers/ThemeProvider.tsx` — NEW
- `src/components/ThemeToggle.tsx` — NEW
- `src/components/orgs/OrgSettings.tsx` — fix Remove button, better errors, dark mode
- `src/app/(app)/dashboard/page.tsx` — better nav, dark mode
- `src/app/(app)/invites/page.tsx` — dark mode, polish
- `src/app/(auth)/login/LoginForm.tsx` — dark mode, validation
- `src/app/(auth)/register/page.tsx` — dark mode, validation
- `src/components/notes/NoteList.tsx` — dark mode, polish
- `src/lib/errors.ts` — NEW
- `docker-compose.local.yml` — NEW
- `tests/unit/errors.test.ts` — NEW
- `tests/e2e/` — NEW Playwright tests

## Build Checkpoints
After each major track, run `pnpm build` and fix errors before proceeding.
