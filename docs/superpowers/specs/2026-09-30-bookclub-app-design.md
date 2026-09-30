# Book Club App — Design Spec

Date: 2026-09-30

## Purpose

Support a single book club's existing workflow (pick a book, read it, meet to
discuss) with the ability to discuss the book *while reading it*, without
spoiling anyone who hasn't reached that part yet.

The core mechanic: each book is broken into sections (e.g. every 5 chapters,
chosen by the admin). Each section has its own discussion thread. A member
must explicitly "join" a section's thread to see or post in it — joining is
permanent (once unlocked, always visible), similar to opting into a
spoiler-gated subreddit.

## Scope

- Single book club (not a multi-club platform).
- One admin (the club organizer) who manages books, sections, and the member
  allow-list.
- A small, fixed membership — not a public sign-up product.
- Simple threaded/forum-style posts, not real-time chat.

## Data Model

- **User** — id, googleId, email, name, avatarUrl, isAdmin, createdAt.
  Created automatically on first successful login.
- **AllowedEmail** — email, addedAt. Login is rejected unless the
  authenticating Google account's email is on this list. Managed by the
  admin.
- **Book** — id, title, author, coverUrl (optional), status
  (`current` | `past`), createdAt.
- **Section** — id, bookId, label (e.g. "Chapters 1–5"), order, createdAt.
  Created by the admin when setting up a book.
- **ThreadMembership** — userId, sectionId, joinedAt. Created when a member
  joins a section's thread. Unique on (userId, sectionId) — joining twice is
  a no-op.
- **Post** — id, sectionId, userId, body, parentPostId (nullable, for
  simple threaded replies), createdAt.

`isAdmin` is a flag on the admin's own user row (or matched via an env var
holding the admin's email) — no general roles/permissions system, since
there is exactly one admin.

## Core Flows

- **Login** — Google sign-in via NextAuth. Rejected with a clear message
  ("you're not on the list, contact the admin") if the email isn't on
  `AllowedEmail`. No user record is created on rejection.
- **Home / current book** — shows the current book and its list of
  sections. Sections the viewer hasn't joined show only their label and a
  locked indicator — no post counts, previews, or other content that could
  hint at what's discussed.
- **Join flow** — clicking a locked section shows a one-line confirmation
  ("This may contain spoilers past Chapters 6–10 — join?") before
  unlocking, since the unlock is permanent.
- **Section thread** — once joined: posts in chronological order, with
  simple reply-to-post threading, and a box to post a new message.
- **Admin panel** (admin only) — create/edit a book, add/reorder sections,
  mark a book `current` vs `past`, manage `AllowedEmail`.
- **Past books** — an archive list of previous books. Old sections/threads
  remain browsable and joinable the same way; nothing expires.

## Error Handling

Kept intentionally minimal given the scale of the project:

- Allow-list rejection → clear message, no account created.
- Duplicate join → idempotent no-op (unique constraint on
  userId+sectionId).
- Empty post submitted → rejected client-side and server-side.
- Admin-only routes → server-side `isAdmin` check, 403 if not admin.

## Testing

Given this is a small, solo-maintained project, automated tests are
focused on the two places a bug would actually cause harm:

1. **Locked sections leak nothing** — a user who hasn't joined a section
   must not receive post content, counts, or previews for it via any
   route/API response.
2. **Allow-list gating** — only emails on `AllowedEmail` can complete
   login; others are rejected without creating a user record.

These are covered with integration tests (Vitest). Everything else is
covered by manual click-through testing during development.

## Architecture

**Approach:** Next.js monolith (chosen over a split frontend/backend or a
Supabase-backed app, given the small scale, the desire to self-host on the
existing VPS, and existing React familiarity).

- Single Next.js (React) app: UI + API routes in one codebase.
- **Auth**: NextAuth.js, Google provider, with a custom check against
  `AllowedEmail` at sign-in.
- **Database**: SQLite (file-based, no separate DB server to run/manage),
  accessed via an ORM (e.g. Prisma).
- **Hosting**: runs as a single Node process on the user's existing VPS,
  supervised by systemd (or pm2) for auto-restart. nginx reverse-proxies a
  subdomain (e.g. `bookclub.example.com`) to the Node process and handles
  TLS via Let's Encrypt/certbot.
- **Google OAuth setup**: app registered in Google Cloud Console; the
  subdomain is added as an authorized redirect URI.
- **Backups**: SQLite is a single file — periodic cron copy elsewhere is
  sufficient at this scale.
- **Deploys**: pull latest code → `npm run build` → restart the service.
  No CI/CD pipeline needed at this size.

## Out of Scope (for this iteration)

- Multi-club support.
- Real-time chat (websockets/live updates).
- Rich admin roles/permissions beyond a single admin flag.
- Public sign-up (membership is invite-only via the allow-list).
