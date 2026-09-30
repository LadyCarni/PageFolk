# Book Club App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-hosted, single-club book discussion app where each book is split into sections, each section has its own discussion thread, and members must explicitly (and permanently) join a section's thread before seeing any of its content — preventing spoilers from reaching members who haven't caught up.

**Architecture:** A single Next.js (App Router, TypeScript) application serves both the UI and all mutations (via Server Actions — no separate REST API). Google sign-in is handled by NextAuth v5 with JWT sessions; a custom allow-list check gates who can complete login. All data lives in SQLite via Prisma. The whole app runs as one Node process, reverse-proxied by nginx on a subdomain.

**Tech Stack:** Next.js 14 (App Router) + TypeScript, Prisma + SQLite, NextAuth v5 (Auth.js) with the Google provider, Tailwind CSS, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-30-bookclub-app-design.md`

## Global Constraints

- Single admin, identified by the `ADMIN_EMAIL` env var — no general roles/permissions system.
- Login is rejected unless the account's email is on the `AllowedEmail` list or equals `ADMIN_EMAIL`.
- Joining a section's thread is permanent — there is no "leave" action in this iteration.
- No real-time/websocket features — posts are simple threaded/forum-style, loaded on page request.
- SQLite via Prisma, self-hosted as a single Node process (no serverless/edge-only APIs).
- No multi-club support — one book club, one set of books/sections.
- UI color palette (dark → light): `#241626`, `#542949`, `#7b3f5d`, `#b86f71`, `#e7b7a6` — configured as Tailwind's `brand` scale in Task 1 and used for buttons, links, and headings; exact usage can be refined later.

## Review Focus

- A user who has not joined a section must receive **zero** content for it (no post bodies, no post counts, no previews) from any function or page — not just a UI that hides a button. (Task 7, backed by Task 5)
- A Google login for an email not on the allow-list (and not `ADMIN_EMAIL`) is rejected without creating a `User` row. (Task 3)
- Joining a section the user has already joined does not error and does not create a duplicate `ThreadMembership` row. (Task 6, backed by Task 2's schema)
- Submitting an empty or whitespace-only post is rejected, whether from the UI or by calling the underlying function directly. (Task 7)
- A non-admin who invokes an admin-only Server Action directly (bypassing the admin UI) is rejected — Server Actions are callable from any authenticated request, not just the pages that render their forms. (Task 3's `requireAdmin`, exercised in Task 4)

---

## Task 1: Project Scaffolding & Tooling

This task has no business logic to drive with TDD, so its "test" is the project building successfully rather than a red/green unit test. Every later task follows the standard TDD step structure.

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.mjs`
- Create: `tailwind.config.ts`
- Create: `postcss.config.mjs`
- Create: `vitest.config.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/globals.css`
- Create: `src/app/page.tsx`
- Create: `.env.example`
- Create: `.env.test`
- Create: `.gitignore`

**Interfaces:**
- Produces: the `@/*` → `./src/*` path alias (used by every later task's imports and test mocks), the `npm test` script (runs Vitest against `.env.test`'s SQLite file), the `npm run build`/`npm run dev` scripts.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "bookclub",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "pretest": "dotenv -e .env.test -- prisma db push --force-reset --skip-generate",
    "test": "dotenv -e .env.test -- vitest run",
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@prisma/client": "^5.20.0",
    "next-auth": "5.0.0-beta.22"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/node": "^20.14.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "prisma": "^5.20.0",
    "vitest": "^2.1.0",
    "dotenv-cli": "^7.4.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^8.57.0",
    "eslint-config-next": "^14.2.0"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Write `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`**

`next.config.mjs`:
```js
/** @type {import('next').NextConfig} */
const nextConfig = {}
export default nextConfig
```

`tailwind.config.ts`:
```ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          900: '#241626',
          700: '#542949',
          500: '#7b3f5d',
          300: '#b86f71',
          100: '#e7b7a6',
        },
      },
    },
  },
  plugins: [],
} satisfies Config
```

`postcss.config.mjs`:
```js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
}
```

- [ ] **Step 4: Write `vitest.config.ts` with the `@/` alias**

```ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
  },
})
```

- [ ] **Step 5: Write the base app shell**

`src/app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`src/app/layout.tsx`:
```tsx
import './globals.css'
import type { ReactNode } from 'react'

export const metadata = { title: 'Book Club' }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-brand-900">{children}</body>
    </html>
  )
}
```

`src/app/page.tsx` (placeholder — replaced in Task 5):
```tsx
export default function HomePage() {
  return <main className="p-8">Book Club — coming soon.</main>
}
```

- [ ] **Step 6: Write env files and `.gitignore`**

`.env.example`:
```
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
ADMIN_EMAIL="you@example.com"
```

`.env.test` (committed — fixed, non-secret values so tests are reproducible for anyone who clones the repo):
```
DATABASE_URL="file:./prisma/test.db"
NEXTAUTH_SECRET="test-secret"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="test"
GOOGLE_CLIENT_SECRET="test"
ADMIN_EMAIL="admin@example.com"
```

`.gitignore`:
```
node_modules
.next
*.db
*.db-journal
.env
.env.local
```

- [ ] **Step 7: Install dependencies**

Run: `npm install`
Expected: installs without error, creates `package-lock.json`.

- [ ] **Step 8: Verify the scaffold builds**

Run: `npm run build`
Expected: build succeeds (it's fine that the site is just the placeholder page).

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.mjs tailwind.config.ts postcss.config.mjs vitest.config.ts src .env.example .env.test .gitignore
git commit -m "chore: scaffold Next.js app with TypeScript, Tailwind, and Vitest"
```

---

## Task 2: Database Schema & Prisma Client

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/db.ts`
- Test: `tests/lib/db.test.ts`

**Interfaces:**
- Consumes: nothing (foundational).
- Produces: `prisma` (a `PrismaClient` instance) exported from `@/lib/db`; the Prisma models `User`, `AllowedEmail`, `Book`, `Section`, `ThreadMembership`, `Post` with the fields listed below, used by every subsequent task.

- [ ] **Step 1: Write the failing test**

`tests/lib/db.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'

describe('prisma schema', () => {
  beforeEach(async () => {
    await prisma.post.deleteMany()
    await prisma.threadMembership.deleteMany()
    await prisma.section.deleteMany()
    await prisma.book.deleteMany()
    await prisma.user.deleteMany()
    await prisma.allowedEmail.deleteMany()
  })

  it('creates a book with a section, a user, a membership, and a post', async () => {
    const book = await prisma.book.create({
      data: {
        title: 'Dune',
        author: 'Frank Herbert',
        status: 'current',
        sections: { create: [{ label: 'Chapters 1-5', order: 1 }] },
      },
      include: { sections: true },
    })

    const user = await prisma.user.create({
      data: { googleId: 'g-1', email: 'reader@example.com', name: 'Reader' },
    })

    await prisma.threadMembership.create({
      data: { userId: user.id, sectionId: book.sections[0].id },
    })

    const post = await prisma.post.create({
      data: { sectionId: book.sections[0].id, userId: user.id, body: 'What a start!' },
    })

    const found = await prisma.post.findUniqueOrThrow({
      where: { id: post.id },
      include: { user: true, section: true },
    })

    expect(found.body).toBe('What a start!')
    expect(found.user.email).toBe('reader@example.com')
    expect(found.section.label).toBe('Chapters 1-5')
  })

  it('rejects a duplicate ThreadMembership for the same user and section', async () => {
    const book = await prisma.book.create({
      data: { title: 'Dune', author: 'Frank Herbert', sections: { create: [{ label: 'Chapters 1-5', order: 1 }] } },
      include: { sections: true },
    })
    const user = await prisma.user.create({ data: { googleId: 'g-2', email: 'dup@example.com' } })

    await prisma.threadMembership.create({ data: { userId: user.id, sectionId: book.sections[0].id } })

    await expect(
      prisma.threadMembership.create({ data: { userId: user.id, sectionId: book.sections[0].id } })
    ).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/db.test.ts`
Expected: FAIL (no `prisma/schema.prisma`, no `@/lib/db`, `@prisma/client` not generated).

- [ ] **Step 3: Write the Prisma schema**

`prisma/schema.prisma`:
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String   @id @default(cuid())
  googleId  String   @unique
  email     String   @unique
  name      String?
  avatarUrl String?
  createdAt DateTime @default(now())

  memberships ThreadMembership[]
  posts       Post[]
}

model AllowedEmail {
  email   String   @id
  addedAt DateTime @default(now())
}

model Book {
  id        String   @id @default(cuid())
  title     String
  author    String
  coverUrl  String?
  status    String   @default("current")
  createdAt DateTime @default(now())

  sections Section[]
}

model Section {
  id        String   @id @default(cuid())
  bookId    String
  label     String
  order     Int
  createdAt DateTime @default(now())

  book        Book               @relation(fields: [bookId], references: [id])
  memberships ThreadMembership[]
  posts       Post[]

  @@unique([bookId, order])
}

model ThreadMembership {
  userId    String
  sectionId String
  joinedAt  DateTime @default(now())

  user    User    @relation(fields: [userId], references: [id])
  section Section @relation(fields: [sectionId], references: [id])

  @@id([userId, sectionId])
}

model Post {
  id           String   @id @default(cuid())
  sectionId    String
  userId       String
  body         String
  parentPostId String?
  createdAt    DateTime @default(now())

  section    Section @relation(fields: [sectionId], references: [id])
  user       User    @relation(fields: [userId], references: [id])
  parentPost Post?   @relation("Replies", fields: [parentPostId], references: [id])
  replies    Post[]  @relation("Replies")
}
```

Note: `status` on `Book` is a plain string (`"current"` | `"past"`) rather than a Prisma enum — SQLite has no native enum type, and Prisma enforces enums only at the client/TS level, so a validated string is simpler here.

- [ ] **Step 4: Write the Prisma client singleton**

`src/lib/db.ts`:
```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

- [ ] **Step 5: Generate the client and push the schema to the test database**

Run: `npx prisma generate`
Run: `npm run pretest` (pushes the schema to `prisma/test.db` per `.env.test`)
Expected: both succeed.

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- tests/lib/db.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 7: Also create the dev database**

Run: `npx prisma db push` (uses `DATABASE_URL` from a local `.env` you create by copying `.env.example`)
Expected: creates `prisma/dev.db`.

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma src/lib/db.ts tests/lib/db.test.ts
git commit -m "feat: add Prisma schema and database client"
```

---

## Task 3: Authentication & Access Control

Covers Google sign-in, the allow-list gate, admin identification, route protection, and the `requireUser`/`requireAdmin` helpers every later Server Action depends on. The full OAuth handshake itself can't be meaningfully unit-tested (it requires a live Google account) — that part gets a manual verification step at the end. The allow-list, admin-check, and session-helper logic are pure functions and are fully covered by automated tests.

**Files:**
- Create: `src/lib/allowlist.ts`
- Create: `src/lib/admin.ts`
- Create: `src/lib/session.ts`
- Create: `src/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/types/next-auth.d.ts`
- Create: `src/middleware.ts`
- Create: `src/app/sign-in/page.tsx`
- Test: `tests/lib/allowlist.test.ts`
- Test: `tests/lib/admin.test.ts`
- Test: `tests/lib/session.test.ts`

**Interfaces:**
- Consumes: `prisma` from `@/lib/db` (Task 2).
- Produces: `isEmailAllowed(email: string): Promise<boolean>`, `addAllowedEmail(email: string): Promise<void>`, `removeAllowedEmail(email: string): Promise<void>`, `listAllowedEmails(): Promise<string[]>` from `@/lib/allowlist`; `isAdminEmail(email: string | null | undefined): boolean` from `@/lib/admin`; `requireUser(): Promise<{id: string; email: string; name?: string | null; isAdmin: boolean}>` and `requireAdmin(): Promise<same>` (throws `Error` if unauthenticated/non-admin) from `@/lib/session` — used by every Server Action in Tasks 4, 6, and 7; `auth`, `signIn`, `signOut` from `@/auth`.

- [ ] **Step 1: Install NextAuth**

Run: `npm install next-auth@beta`
Expected: adds to `package.json` (already listed there from Task 1, so this confirms the lockfile is in sync).

- [ ] **Step 2: Write the failing allow-list test**

`tests/lib/allowlist.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { prisma } from '@/lib/db'
import { isEmailAllowed, addAllowedEmail, removeAllowedEmail, listAllowedEmails } from '@/lib/allowlist'

describe('allowlist', () => {
  beforeEach(async () => {
    await prisma.allowedEmail.deleteMany()
    vi.stubEnv('ADMIN_EMAIL', 'admin@example.com')
  })

  it('allows the admin email even if not explicitly listed', async () => {
    expect(await isEmailAllowed('admin@example.com')).toBe(true)
  })

  it('rejects an email that is neither listed nor the admin', async () => {
    expect(await isEmailAllowed('stranger@example.com')).toBe(false)
  })

  it('allows an email once added to the list', async () => {
    await addAllowedEmail('member@example.com')
    expect(await isEmailAllowed('member@example.com')).toBe(true)
  })

  it('is case-insensitive', async () => {
    await addAllowedEmail('Member@Example.com')
    expect(await isEmailAllowed('member@example.com')).toBe(true)
  })

  it('removes an email from the list', async () => {
    await addAllowedEmail('member@example.com')
    await removeAllowedEmail('member@example.com')
    expect(await isEmailAllowed('member@example.com')).toBe(false)
  })

  it('lists allowed emails in the order they were added', async () => {
    await addAllowedEmail('a@example.com')
    await addAllowedEmail('b@example.com')
    expect(await listAllowedEmails()).toEqual(['a@example.com', 'b@example.com'])
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- tests/lib/allowlist.test.ts`
Expected: FAIL (`@/lib/allowlist` doesn't exist).

- [ ] **Step 4: Implement the allow-list**

`src/lib/allowlist.ts`:
```ts
import { prisma } from '@/lib/db'

export async function isEmailAllowed(email: string): Promise<boolean> {
  const normalized = email.toLowerCase()
  if (normalized === process.env.ADMIN_EMAIL?.toLowerCase()) {
    return true
  }
  const entry = await prisma.allowedEmail.findUnique({ where: { email: normalized } })
  return entry !== null
}

export async function addAllowedEmail(email: string): Promise<void> {
  await prisma.allowedEmail.upsert({
    where: { email: email.toLowerCase() },
    update: {},
    create: { email: email.toLowerCase() },
  })
}

export async function removeAllowedEmail(email: string): Promise<void> {
  await prisma.allowedEmail.deleteMany({ where: { email: email.toLowerCase() } })
}

export async function listAllowedEmails(): Promise<string[]> {
  const rows = await prisma.allowedEmail.findMany({ orderBy: { addedAt: 'asc' } })
  return rows.map((r) => r.email)
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- tests/lib/allowlist.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Write the failing admin-check test**

`tests/lib/admin.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isAdminEmail } from '@/lib/admin'

describe('isAdminEmail', () => {
  beforeEach(() => {
    vi.stubEnv('ADMIN_EMAIL', 'admin@example.com')
  })

  it('returns true for the configured admin email', () => {
    expect(isAdminEmail('admin@example.com')).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(isAdminEmail('Admin@Example.com')).toBe(true)
  })

  it('returns false for any other email', () => {
    expect(isAdminEmail('someone@example.com')).toBe(false)
  })

  it('returns false for null or undefined', () => {
    expect(isAdminEmail(null)).toBe(false)
    expect(isAdminEmail(undefined)).toBe(false)
  })
})
```

- [ ] **Step 7: Run test to verify it fails, then implement**

Run: `npm test -- tests/lib/admin.test.ts` → expect FAIL.

`src/lib/admin.ts`:
```ts
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email || !process.env.ADMIN_EMAIL) return false
  return email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase()
}
```

Run: `npm test -- tests/lib/admin.test.ts` → expect PASS (4 tests).

- [ ] **Step 8: Write the NextAuth config, route, and type augmentation**

`src/types/next-auth.d.ts`:
```ts
import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      isAdmin: boolean
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string
    isAdmin?: boolean
  }
}
```

`src/auth.ts`:
```ts
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { prisma } from '@/lib/db'
import { isEmailAllowed } from '@/lib/allowlist'
import { isAdminEmail } from '@/lib/admin'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  pages: { signIn: '/sign-in' },
  session: { strategy: 'jwt' },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false
      return isEmailAllowed(user.email)
    },
    async jwt({ token }) {
      if (token.email) {
        const dbUser = await prisma.user.upsert({
          where: { email: token.email },
          update: {
            name: token.name ?? undefined,
            avatarUrl: (token.picture as string | undefined) ?? undefined,
          },
          create: {
            email: token.email,
            name: token.name ?? undefined,
            avatarUrl: (token.picture as string | undefined) ?? undefined,
            googleId: (token.sub as string) ?? token.email,
          },
        })
        token.userId = dbUser.id
        token.isAdmin = isAdminEmail(dbUser.email)
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string
        session.user.isAdmin = Boolean(token.isAdmin)
      }
      return session
    },
    authorized({ auth }) {
      return Boolean(auth?.user)
    },
  },
})
```

`src/app/api/auth/[...nextauth]/route.ts`:
```ts
import { handlers } from '@/auth'

export const { GET, POST } = handlers
```

`src/middleware.ts`:
```ts
export { auth as middleware } from '@/auth'

export const config = {
  matcher: ['/((?!api/auth|sign-in|_next/static|_next/image|favicon.ico).*)'],
}
```

`src/app/sign-in/page.tsx`:
```tsx
import { signIn } from '@/auth'

export default function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-xl font-semibold text-brand-900">Book Club</h1>
      <p className="text-gray-600">Sign in with the Google account you were invited with.</p>
      <form
        action={async () => {
          'use server'
          await signIn('google')
        }}
      >
        <button type="submit" className="rounded bg-brand-700 px-4 py-2 text-white hover:bg-brand-900">
          Sign in with Google
        </button>
      </form>
    </main>
  )
}
```

- [ ] **Step 9: Write the failing session-helper test**

`tests/lib/session.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuth = vi.fn()
vi.mock('@/auth', () => ({ auth: () => mockAuth() }))

import { requireUser, requireAdmin } from '@/lib/session'

describe('requireUser', () => {
  beforeEach(() => mockAuth.mockReset())

  it('returns the session user when signed in', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', email: 'a@example.com', isAdmin: false } })
    const user = await requireUser()
    expect(user.id).toBe('1')
  })

  it('throws when not signed in', async () => {
    mockAuth.mockResolvedValue(null)
    await expect(requireUser()).rejects.toThrow('Not signed in')
  })
})

describe('requireAdmin', () => {
  beforeEach(() => mockAuth.mockReset())

  it('returns the user when they are an admin', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', email: 'a@example.com', isAdmin: true } })
    const user = await requireAdmin()
    expect(user.isAdmin).toBe(true)
  })

  it('throws Forbidden when the user is not an admin', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', email: 'a@example.com', isAdmin: false } })
    await expect(requireAdmin()).rejects.toThrow('Forbidden')
  })
})
```

- [ ] **Step 10: Run test to verify it fails, then implement**

Run: `npm test -- tests/lib/session.test.ts` → expect FAIL (`@/lib/session` doesn't exist).

`src/lib/session.ts`:
```ts
import { auth } from '@/auth'

export async function requireUser() {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Not signed in')
  }
  return session.user
}

export async function requireAdmin() {
  const user = await requireUser()
  if (!user.isAdmin) {
    throw new Error('Forbidden: admin only')
  }
  return user
}
```

Run: `npm test -- tests/lib/session.test.ts` → expect PASS (4 tests).

- [ ] **Step 11: Set up Google OAuth credentials for local testing**

In the [Google Cloud Console](https://console.cloud.google.com/apis/credentials): create an OAuth 2.0 Client ID (Web application), add `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI, and put the resulting client ID/secret plus a generated `NEXTAUTH_SECRET` (`openssl rand -base64 32`) into your local `.env`. Set `ADMIN_EMAIL` to your own Google account's email.

- [ ] **Step 12: Manually verify the OAuth handshake**

Run: `npm run dev`, visit `http://localhost:3000`, get redirected to `/sign-in`, click "Sign in with Google," complete the flow with your own (admin) account.
Expected: redirected back to the app signed in (the placeholder home page loads without redirecting to `/sign-in` again). Confirm in Prisma Studio (`npm run db:studio`) that a `User` row was created for your email.

- [ ] **Step 13: Manually verify allow-list rejection**

Sign out, then attempt to sign in with a Google account whose email is neither `ADMIN_EMAIL` nor in `AllowedEmail`.
Expected: NextAuth redirects back to `/sign-in` with an error, and no new `User` row appears in Prisma Studio for that email.

- [ ] **Step 14: Commit**

```bash
git add src/lib/allowlist.ts src/lib/admin.ts src/lib/session.ts src/auth.ts src/app/api/auth src/types/next-auth.d.ts src/middleware.ts src/app/sign-in tests/lib/allowlist.test.ts tests/lib/admin.test.ts tests/lib/session.test.ts package.json package-lock.json
git commit -m "feat: add Google sign-in, allow-list gating, and admin/session helpers"
```

---

## Task 4: Admin Management — Books, Sections, Allow-List

**Files:**
- Create: `src/lib/books.ts`
- Create: `src/app/admin/actions.ts`
- Create: `src/app/admin/page.tsx`
- Create: `src/app/admin/allowed-emails/page.tsx`
- Test: `tests/lib/books.test.ts`
- Test: `tests/app/admin-actions.test.ts`

**Interfaces:**
- Consumes: `requireAdmin` from `@/lib/session` (Task 3); `addAllowedEmail`, `removeAllowedEmail`, `listAllowedEmails` from `@/lib/allowlist` (Task 3); `prisma` from `@/lib/db` (Task 2).
- Produces: `listBooks(status?: 'current' | 'past')`, `createBook(input: {title: string; author: string; coverUrl?: string})`, `addSection(bookId: string, label: string, order: number)`, `setBookStatus(bookId: string, status: 'current' | 'past')` from `@/lib/books` — `listBooks` is consumed by Task 5 and Task 8; Server Actions `createBookAction`, `addSectionAction`, `setBookStatusAction`, `addAllowedEmailAction`, `removeAllowedEmailAction` from `@/app/admin/actions`.

- [ ] **Step 1: Write the failing books-lib test**

`tests/lib/books.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { listBooks, createBook, addSection, setBookStatus } from '@/lib/books'

describe('books', () => {
  beforeEach(async () => {
    await prisma.post.deleteMany()
    await prisma.threadMembership.deleteMany()
    await prisma.section.deleteMany()
    await prisma.book.deleteMany()
  })

  it('creates a book as current by default', async () => {
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert' })
    expect(book.status).toBe('current')
  })

  it('adds sections to a book', async () => {
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert' })
    await addSection(book.id, 'Chapters 1-5', 1)
    await addSection(book.id, 'Chapters 6-10', 2)

    const [found] = await listBooks('current')
    expect(found.sections.map((s) => s.label)).toEqual(['Chapters 1-5', 'Chapters 6-10'])
  })

  it('filters by status', async () => {
    const current = await createBook({ title: 'Dune', author: 'Frank Herbert' })
    const past = await createBook({ title: 'Old Book', author: 'Someone' })
    await setBookStatus(past.id, 'past')

    expect((await listBooks('current')).map((b) => b.id)).toEqual([current.id])
    expect((await listBooks('past')).map((b) => b.id)).toEqual([past.id])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/books.test.ts`
Expected: FAIL (`@/lib/books` doesn't exist).

- [ ] **Step 3: Implement the books library**

`src/lib/books.ts`:
```ts
import { prisma } from '@/lib/db'

export async function listBooks(status?: 'current' | 'past') {
  return prisma.book.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    include: { sections: { orderBy: { order: 'asc' } } },
  })
}

export async function createBook(input: { title: string; author: string; coverUrl?: string }) {
  return prisma.book.create({ data: { ...input, status: 'current' } })
}

export async function addSection(bookId: string, label: string, order: number) {
  return prisma.section.create({ data: { bookId, label, order } })
}

export async function setBookStatus(bookId: string, status: 'current' | 'past') {
  return prisma.book.update({ where: { id: bookId }, data: { status } })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/books.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the failing Server Actions test (admin gating)**

`tests/app/admin-actions.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'

const mockRequireAdmin = vi.fn()
vi.mock('@/lib/session', () => ({ requireAdmin: () => mockRequireAdmin() }))

import { createBookAction, addAllowedEmailAction } from '@/app/admin/actions'

describe('admin actions', () => {
  beforeEach(async () => {
    mockRequireAdmin.mockReset()
    await prisma.allowedEmail.deleteMany()
    await prisma.section.deleteMany()
    await prisma.book.deleteMany()
  })

  it('rejects createBookAction for a non-admin', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Forbidden: admin only'))
    const fd = new FormData()
    fd.set('title', 'Dune')
    fd.set('author', 'Frank Herbert')
    await expect(createBookAction(fd)).rejects.toThrow('Forbidden')
  })

  it('creates a book for an admin', async () => {
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
    const fd = new FormData()
    fd.set('title', 'Dune')
    fd.set('author', 'Frank Herbert')
    const book = await createBookAction(fd)
    expect(book.title).toBe('Dune')
  })

  it('rejects a title-less book', async () => {
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
    const fd = new FormData()
    fd.set('title', '  ')
    fd.set('author', 'Frank Herbert')
    await expect(createBookAction(fd)).rejects.toThrow('required')
  })

  it('rejects addAllowedEmailAction for a non-admin', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Forbidden: admin only'))
    const fd = new FormData()
    fd.set('email', 'new@example.com')
    await expect(addAllowedEmailAction(fd)).rejects.toThrow('Forbidden')
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- tests/app/admin-actions.test.ts`
Expected: FAIL (`@/app/admin/actions` doesn't exist).

- [ ] **Step 7: Implement the Server Actions**

`src/app/admin/actions.ts`:
```ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/session'
import { createBook, addSection, setBookStatus } from '@/lib/books'
import { addAllowedEmail, removeAllowedEmail } from '@/lib/allowlist'

export async function createBookAction(formData: FormData) {
  await requireAdmin()
  const title = String(formData.get('title') ?? '').trim()
  const author = String(formData.get('author') ?? '').trim()
  if (!title || !author) {
    throw new Error('Title and author are required')
  }
  const book = await createBook({ title, author })
  revalidatePath('/admin')
  return book
}

export async function addSectionAction(formData: FormData) {
  await requireAdmin()
  const bookId = String(formData.get('bookId') ?? '')
  const label = String(formData.get('label') ?? '').trim()
  const order = Number(formData.get('order') ?? 0)
  if (!bookId || !label) {
    throw new Error('bookId and label are required')
  }
  await addSection(bookId, label, order)
  revalidatePath('/admin')
}

export async function setBookStatusAction(bookId: string, status: 'current' | 'past') {
  await requireAdmin()
  await setBookStatus(bookId, status)
  revalidatePath('/admin')
  revalidatePath('/')
}

export async function addAllowedEmailAction(formData: FormData) {
  await requireAdmin()
  const email = String(formData.get('email') ?? '').trim()
  if (!email) throw new Error('email is required')
  await addAllowedEmail(email)
  revalidatePath('/admin/allowed-emails')
}

export async function removeAllowedEmailAction(email: string) {
  await requireAdmin()
  await removeAllowedEmail(email)
  revalidatePath('/admin/allowed-emails')
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- tests/app/admin-actions.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 9: Build the admin UI**

`src/app/admin/page.tsx`:
```tsx
import { requireAdmin } from '@/lib/session'
import { listBooks } from '@/lib/books'
import { createBookAction, addSectionAction, setBookStatusAction } from './actions'

export default async function AdminPage() {
  await requireAdmin()
  const books = await listBooks()

  return (
    <main className="mx-auto max-w-2xl p-8 space-y-8">
      <h1 className="text-xl font-semibold text-brand-900">Admin</h1>

      <section>
        <h2 className="font-medium mb-2">New book</h2>
        <form action={createBookAction} className="flex gap-2">
          <input name="title" placeholder="Title" className="border px-2 py-1" required />
          <input name="author" placeholder="Author" className="border px-2 py-1" required />
          <button type="submit" className="bg-brand-700 text-white px-3 py-1 rounded hover:bg-brand-900">
            Add book
          </button>
        </form>
      </section>

      <section className="space-y-6">
        {books.map((book) => (
          <div key={book.id} className="border rounded p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">
                {book.title} — {book.author} ({book.status})
              </h3>
              <form
                action={async () => {
                  'use server'
                  await setBookStatusAction(book.id, book.status === 'current' ? 'past' : 'current')
                }}
              >
                <button type="submit" className="text-sm underline">
                  Mark as {book.status === 'current' ? 'past' : 'current'}
                </button>
              </form>
            </div>
            <ul className="mt-2 text-sm text-gray-600">
              {book.sections.map((s) => (
                <li key={s.id}>
                  {s.order}. {s.label}
                </li>
              ))}
            </ul>
            <form action={addSectionAction} className="mt-2 flex gap-2">
              <input type="hidden" name="bookId" value={book.id} />
              <input name="label" placeholder="e.g. Chapters 6-10" className="border px-2 py-1" required />
              <input
                name="order"
                type="number"
                defaultValue={book.sections.length + 1}
                className="border px-2 py-1 w-20"
                required
              />
              <button type="submit" className="bg-brand-700 text-white px-3 py-1 rounded hover:bg-brand-900">
                Add section
              </button>
            </form>
          </div>
        ))}
      </section>
    </main>
  )
}
```

`src/app/admin/allowed-emails/page.tsx`:
```tsx
import { requireAdmin } from '@/lib/session'
import { listAllowedEmails } from '@/lib/allowlist'
import { addAllowedEmailAction, removeAllowedEmailAction } from '../actions'

export default async function AllowedEmailsPage() {
  await requireAdmin()
  const emails = await listAllowedEmails()

  return (
    <main className="mx-auto max-w-2xl p-8 space-y-4">
      <h1 className="text-xl font-semibold text-brand-900">Allowed members</h1>
      <form action={addAllowedEmailAction} className="flex gap-2">
        <input name="email" type="email" placeholder="member@example.com" className="border px-2 py-1" required />
        <button type="submit" className="bg-brand-700 text-white px-3 py-1 rounded hover:bg-brand-900">
          Add
        </button>
      </form>
      <ul className="space-y-1">
        {emails.map((email) => (
          <li key={email} className="flex items-center justify-between border-b py-1">
            <span>{email}</span>
            <form
              action={async () => {
                'use server'
                await removeAllowedEmailAction(email)
              }}
            >
              <button type="submit" className="text-sm text-red-600 underline">
                Remove
              </button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  )
}
```

- [ ] **Step 10: Manually verify the admin UI**

Run: `npm run dev`, sign in as the admin, visit `/admin`, create a book, add two sections, visit `/admin/allowed-emails`, add and remove an email.
Expected: all actions succeed and the page reflects the changes after each submit (no manual refresh needed, thanks to `revalidatePath`).

- [ ] **Step 11: Commit**

```bash
git add src/lib/books.ts src/app/admin tests/lib/books.test.ts tests/app/admin-actions.test.ts
git commit -m "feat: add admin book/section management and allow-list UI"
```

---

## Task 5: Home Page — Current Book & Section List

This is the first place the "locked sections show nothing" rule has to hold — its test is part of this task's Review Focus coverage.

**Files:**
- Create: `src/lib/sections.ts` (started here, extended in Tasks 6 and 7)
- Modify: `src/app/page.tsx`
- Test: `tests/lib/sections.test.ts`

**Interfaces:**
- Consumes: `requireUser` from `@/lib/session` (Task 3); `listBooks` from `@/lib/books` (Task 4); `prisma` from `@/lib/db` (Task 2).
- Produces: `type SectionSummary = { id: string; label: string; order: number; status: 'locked' } | { id: string; label: string; order: number; status: 'unlocked'; postCount: number }` and `getSectionsForViewer(bookId: string, userId: string): Promise<SectionSummary[]>` from `@/lib/sections` — consumed by Task 8's past-books page and by Task 6's join UI.

- [ ] **Step 1: Write the failing test**

`tests/lib/sections.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { getSectionsForViewer } from '@/lib/sections'

describe('getSectionsForViewer', () => {
  beforeEach(async () => {
    await prisma.post.deleteMany()
    await prisma.threadMembership.deleteMany()
    await prisma.section.deleteMany()
    await prisma.book.deleteMany()
    await prisma.user.deleteMany()
  })

  it('marks a section the viewer has not joined as locked, with no postCount', async () => {
    const book = await prisma.book.create({
      data: { title: 'Dune', author: 'Herbert', sections: { create: [{ label: 'Ch 1-5', order: 1 }] } },
      include: { sections: true },
    })
    const author = await prisma.user.create({ data: { googleId: 'g-1', email: 'author@example.com' } })
    const viewer = await prisma.user.create({ data: { googleId: 'g-2', email: 'viewer@example.com' } })
    await prisma.post.create({ data: { sectionId: book.sections[0].id, userId: author.id, body: 'Spoiler!' } })

    const summaries = await getSectionsForViewer(book.id, viewer.id)

    expect(summaries).toEqual([{ id: book.sections[0].id, label: 'Ch 1-5', order: 1, status: 'locked' }])
    expect(summaries[0]).not.toHaveProperty('postCount')
  })

  it('marks a joined section as unlocked with its post count', async () => {
    const book = await prisma.book.create({
      data: { title: 'Dune', author: 'Herbert', sections: { create: [{ label: 'Ch 1-5', order: 1 }] } },
      include: { sections: true },
    })
    const viewer = await prisma.user.create({ data: { googleId: 'g-3', email: 'viewer2@example.com' } })
    await prisma.threadMembership.create({ data: { userId: viewer.id, sectionId: book.sections[0].id } })
    await prisma.post.create({ data: { sectionId: book.sections[0].id, userId: viewer.id, body: 'Hi' } })

    const summaries = await getSectionsForViewer(book.id, viewer.id)

    expect(summaries[0]).toEqual({
      id: book.sections[0].id,
      label: 'Ch 1-5',
      order: 1,
      status: 'unlocked',
      postCount: 1,
    })
  })

  it('orders sections by their order field', async () => {
    const book = await prisma.book.create({
      data: {
        title: 'Dune',
        author: 'Herbert',
        sections: { create: [{ label: 'Ch 6-10', order: 2 }, { label: 'Ch 1-5', order: 1 }] },
      },
    })
    const viewer = await prisma.user.create({ data: { googleId: 'g-4', email: 'viewer3@example.com' } })

    const summaries = await getSectionsForViewer(book.id, viewer.id)

    expect(summaries.map((s) => s.label)).toEqual(['Ch 1-5', 'Ch 6-10'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/sections.test.ts`
Expected: FAIL (`@/lib/sections` doesn't exist).

- [ ] **Step 3: Implement `getSectionsForViewer`**

`src/lib/sections.ts`:
```ts
import { prisma } from '@/lib/db'

export type SectionSummary =
  | { id: string; label: string; order: number; status: 'locked' }
  | { id: string; label: string; order: number; status: 'unlocked'; postCount: number }

export async function getSectionsForViewer(bookId: string, userId: string): Promise<SectionSummary[]> {
  const sections = await prisma.section.findMany({
    where: { bookId },
    orderBy: { order: 'asc' },
    include: {
      memberships: { where: { userId } },
      _count: { select: { posts: true } },
    },
  })

  return sections.map((section) => {
    const joined = section.memberships.length > 0
    if (!joined) {
      return { id: section.id, label: section.label, order: section.order, status: 'locked' as const }
    }
    return {
      id: section.id,
      label: section.label,
      order: section.order,
      status: 'unlocked' as const,
      postCount: section._count.posts,
    }
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/sections.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Build the home page**

`src/app/page.tsx`:
```tsx
import Link from 'next/link'
import { requireUser } from '@/lib/session'
import { listBooks } from '@/lib/books'
import { getSectionsForViewer } from '@/lib/sections'

export default async function HomePage() {
  const user = await requireUser()
  const [book] = await listBooks('current')

  if (!book) {
    return <main className="p-8">No current book yet — check back soon.</main>
  }

  const sections = await getSectionsForViewer(book.id, user.id)

  return (
    <main className="mx-auto max-w-2xl p-8 space-y-4">
      <h1 className="text-xl font-semibold text-brand-900">
        {book.title} <span className="text-brand-500">by {book.author}</span>
      </h1>
      <ul className="space-y-2">
        {sections.map((section) => (
          <li key={section.id} className="border rounded p-3 flex items-center justify-between">
            {section.status === 'locked' ? (
              <span className="text-brand-500">🔒 {section.label}</span>
            ) : (
              <Link href={`/sections/${section.id}`} className="text-brand-700 underline">
                {section.label} ({section.postCount} posts)
              </Link>
            )}
          </li>
        ))}
      </ul>
    </main>
  )
}
```

Locked sections deliberately render only the lock icon and label — no link, no post count — matching what `getSectionsForViewer` returns for them.

- [ ] **Step 6: Manually verify**

Run: `npm run dev`, sign in, visit `/`.
Expected: current book's sections render, with unjoined ones showing just a lock icon and label.

- [ ] **Step 7: Commit**

```bash
git add src/lib/sections.ts src/app/page.tsx tests/lib/sections.test.ts
git commit -m "feat: add home page with locked/unlocked section list"
```

---

## Task 6: Join Flow

**Files:**
- Modify: `src/lib/sections.ts`
- Create: `src/app/sections/actions.ts`
- Modify: `src/app/page.tsx`
- Test: `tests/lib/sections.test.ts` (extended)

**Interfaces:**
- Consumes: `requireUser` from `@/lib/session` (Task 3); `SectionSummary` type from `@/lib/sections` (Task 5).
- Produces: `joinSection(userId: string, sectionId: string): Promise<void>` (idempotent) from `@/lib/sections`, consumed by Task 7; Server Action `joinSectionAction(sectionId: string)` from `@/app/sections/actions`.

- [ ] **Step 1: Write the failing test**

Append to `tests/lib/sections.test.ts`:
```ts
import { joinSection } from '@/lib/sections'

describe('joinSection', () => {
  beforeEach(async () => {
    await prisma.post.deleteMany()
    await prisma.threadMembership.deleteMany()
    await prisma.section.deleteMany()
    await prisma.book.deleteMany()
    await prisma.user.deleteMany()
  })

  it('creates a membership that unlocks the section', async () => {
    const book = await prisma.book.create({
      data: { title: 'Dune', author: 'Herbert', sections: { create: [{ label: 'Ch 1-5', order: 1 }] } },
      include: { sections: true },
    })
    const user = await prisma.user.create({ data: { googleId: 'g-5', email: 'joiner@example.com' } })

    await joinSection(user.id, book.sections[0].id)

    const summaries = await getSectionsForViewer(book.id, user.id)
    expect(summaries[0].status).toBe('unlocked')
  })

  it('is idempotent — joining twice does not throw or duplicate the membership', async () => {
    const book = await prisma.book.create({
      data: { title: 'Dune', author: 'Herbert', sections: { create: [{ label: 'Ch 1-5', order: 1 }] } },
      include: { sections: true },
    })
    const user = await prisma.user.create({ data: { googleId: 'g-6', email: 'joiner2@example.com' } })

    await joinSection(user.id, book.sections[0].id)
    await joinSection(user.id, book.sections[0].id)

    const count = await prisma.threadMembership.count({
      where: { userId: user.id, sectionId: book.sections[0].id },
    })
    expect(count).toBe(1)
  })
})
```

(This file already imports `getSectionsForViewer` and `prisma` from earlier in Task 5 — just add the `joinSection` import and this new `describe` block.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/sections.test.ts`
Expected: FAIL (`joinSection` is not exported).

- [ ] **Step 3: Implement `joinSection`**

Add to `src/lib/sections.ts`:
```ts
export async function joinSection(userId: string, sectionId: string): Promise<void> {
  await prisma.threadMembership.upsert({
    where: { userId_sectionId: { userId, sectionId } },
    update: {},
    create: { userId, sectionId },
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/sections.test.ts`
Expected: PASS (all tests in the file, including the two new ones).

- [ ] **Step 5: Add the Server Action**

`src/app/sections/actions.ts`:
```ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/session'
import { joinSection } from '@/lib/sections'

export async function joinSectionAction(sectionId: string) {
  const user = await requireUser()
  await joinSection(user.id, sectionId)
  revalidatePath('/')
  revalidatePath(`/sections/${sectionId}`)
}
```

- [ ] **Step 6: Wire the join confirmation into the home page**

Modify `src/app/page.tsx` — replace the locked `<span>` branch with a confirm form:
```tsx
import { joinSectionAction } from './sections/actions'
```
(add this import near the top, alongside the existing ones)

```tsx
{section.status === 'locked' ? (
  <form
    action={async () => {
      'use server'
      await joinSectionAction(section.id)
    }}
    onSubmit={(e) => {
      if (!confirm(`This may contain spoilers past "${section.label}" — join?`)) {
        e.preventDefault()
      }
    }}
  >
    <button type="submit" className="text-brand-500">
      🔒 {section.label}
    </button>
  </form>
) : (
  <Link href={`/sections/${section.id}`} className="text-brand-700 underline">
    {section.label} ({section.postCount} posts)
  </Link>
)}
```

Note: `onSubmit` with `confirm()` requires this button to live in a Client Component, since `confirm()` is browser-only and event handlers can't be attached from a Server Component. Extract it as `src/components/JoinSectionButton.tsx`:

```tsx
'use client'

export function JoinSectionButton({
  label,
  action,
}: {
  label: string
  action: () => Promise<void>
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`This may contain spoilers past "${label}" — join?`)) {
          e.preventDefault()
        }
      }}
    >
      <button type="submit" className="text-brand-500">
        🔒 {label}
      </button>
    </form>
  )
}
```

And in `src/app/page.tsx`, use it instead of the inline form:
```tsx
import { JoinSectionButton } from '@/components/JoinSectionButton'
```
```tsx
{section.status === 'locked' ? (
  <JoinSectionButton
    label={section.label}
    action={async () => {
      'use server'
      await joinSectionAction(section.id)
    }}
  />
) : (
  <Link href={`/sections/${section.id}`} className="text-brand-700 underline">
    {section.label} ({section.postCount} posts)
  </Link>
)}
```

- [ ] **Step 7: Manually verify**

Run: `npm run dev`, sign in, click a locked section, confirm the browser dialog, verify the section switches to unlocked and links to `/sections/[id]` (which doesn't exist until Task 7 — a 404 there is expected for now).

- [ ] **Step 8: Commit**

```bash
git add src/lib/sections.ts src/app/sections/actions.ts src/app/page.tsx src/components/JoinSectionButton.tsx tests/lib/sections.test.ts
git commit -m "feat: add section join flow with spoiler confirmation"
```

---

## Task 7: Section Thread — View & Post

This is the task the spec's core spoiler guarantee lives or dies on: `getSectionThread` must return literally nothing post-related for a section the caller hasn't joined.

**Files:**
- Modify: `src/lib/sections.ts`
- Create: `src/lib/posts.ts`
- Create: `src/app/sections/[sectionId]/page.tsx`
- Create: `src/components/PostForm.tsx`
- Test: `tests/lib/sections.test.ts` (extended)
- Test: `tests/lib/posts.test.ts`

**Interfaces:**
- Consumes: `requireUser` from `@/lib/session` (Task 3); `joinSection` from `@/lib/sections` (Task 6).
- Produces: `type ThreadResult = { status: 'locked'; label: string } | { status: 'unlocked'; label: string; posts: PostWithAuthor[] }` and `getSectionThread(sectionId: string, userId: string): Promise<ThreadResult>` from `@/lib/sections`; `createPost(sectionId: string, userId: string, body: string, parentPostId?: string)` from `@/lib/posts`.

- [ ] **Step 1: Write the failing test for `getSectionThread`**

Append to `tests/lib/sections.test.ts`:
```ts
import { getSectionThread } from '@/lib/sections'

describe('getSectionThread', () => {
  beforeEach(async () => {
    await prisma.post.deleteMany()
    await prisma.threadMembership.deleteMany()
    await prisma.section.deleteMany()
    await prisma.book.deleteMany()
    await prisma.user.deleteMany()
  })

  it('returns locked with no posts field when the viewer has not joined', async () => {
    const book = await prisma.book.create({
      data: { title: 'Dune', author: 'Herbert', sections: { create: [{ label: 'Ch 1-5', order: 1 }] } },
      include: { sections: true },
    })
    const author = await prisma.user.create({ data: { googleId: 'g-7', email: 'author2@example.com' } })
    const viewer = await prisma.user.create({ data: { googleId: 'g-8', email: 'viewer4@example.com' } })
    await prisma.post.create({ data: { sectionId: book.sections[0].id, userId: author.id, body: 'Spoiler!' } })

    const result = await getSectionThread(book.sections[0].id, viewer.id)

    expect(result).toEqual({ status: 'locked', label: 'Ch 1-5' })
    expect(result).not.toHaveProperty('posts')
  })

  it('returns the posts once the viewer has joined', async () => {
    const book = await prisma.book.create({
      data: { title: 'Dune', author: 'Herbert', sections: { create: [{ label: 'Ch 1-5', order: 1 }] } },
      include: { sections: true },
    })
    const viewer = await prisma.user.create({ data: { googleId: 'g-9', email: 'viewer5@example.com' } })
    await joinSection(viewer.id, book.sections[0].id)
    await prisma.post.create({ data: { sectionId: book.sections[0].id, userId: viewer.id, body: 'Hi all' } })

    const result = await getSectionThread(book.sections[0].id, viewer.id)

    expect(result.status).toBe('unlocked')
    if (result.status === 'unlocked') {
      expect(result.posts).toHaveLength(1)
      expect(result.posts[0].body).toBe('Hi all')
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/sections.test.ts`
Expected: FAIL (`getSectionThread` is not exported).

- [ ] **Step 3: Implement `getSectionThread`**

Add to `src/lib/sections.ts`:
```ts
export type PostWithAuthor = {
  id: string
  body: string
  parentPostId: string | null
  createdAt: Date
  user: { id: string; name: string | null; avatarUrl: string | null }
}

export type ThreadResult =
  | { status: 'locked'; label: string }
  | { status: 'unlocked'; label: string; posts: PostWithAuthor[] }

export async function getSectionThread(sectionId: string, userId: string): Promise<ThreadResult> {
  const section = await prisma.section.findUniqueOrThrow({ where: { id: sectionId } })
  const membership = await prisma.threadMembership.findUnique({
    where: { userId_sectionId: { userId, sectionId } },
  })

  if (!membership) {
    return { status: 'locked', label: section.label }
  }

  const posts = await prisma.post.findMany({
    where: { sectionId },
    orderBy: { createdAt: 'asc' },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  })

  return { status: 'unlocked', label: section.label, posts }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/sections.test.ts`
Expected: PASS (all tests in the file).

- [ ] **Step 5: Write the failing test for `createPost`**

`tests/lib/posts.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { joinSection } from '@/lib/sections'
import { createPost } from '@/lib/posts'

describe('createPost', () => {
  beforeEach(async () => {
    await prisma.post.deleteMany()
    await prisma.threadMembership.deleteMany()
    await prisma.section.deleteMany()
    await prisma.book.deleteMany()
    await prisma.user.deleteMany()
  })

  async function setup() {
    const book = await prisma.book.create({
      data: { title: 'Dune', author: 'Herbert', sections: { create: [{ label: 'Ch 1-5', order: 1 }] } },
      include: { sections: true },
    })
    const user = await prisma.user.create({ data: { googleId: 'g-10', email: 'poster@example.com' } })
    return { sectionId: book.sections[0].id, userId: user.id }
  }

  it('creates a post for a member of the section', async () => {
    const { sectionId, userId } = await setup()
    await joinSection(userId, sectionId)

    const post = await createPost(sectionId, userId, 'Great chapter!')

    expect(post.body).toBe('Great chapter!')
  })

  it('rejects an empty body', async () => {
    const { sectionId, userId } = await setup()
    await joinSection(userId, sectionId)

    await expect(createPost(sectionId, userId, '   ')).rejects.toThrow('empty')
  })

  it('rejects posting from someone who has not joined the section', async () => {
    const { sectionId, userId } = await setup()

    await expect(createPost(sectionId, userId, 'Sneaky post')).rejects.toThrow('join')
  })

  it('supports a parentPostId for threaded replies', async () => {
    const { sectionId, userId } = await setup()
    await joinSection(userId, sectionId)
    const parent = await createPost(sectionId, userId, 'Original thought')

    const reply = await createPost(sectionId, userId, 'Agreed!', parent.id)

    expect(reply.parentPostId).toBe(parent.id)
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- tests/lib/posts.test.ts`
Expected: FAIL (`@/lib/posts` doesn't exist).

- [ ] **Step 7: Implement `createPost`**

`src/lib/posts.ts`:
```ts
import { prisma } from '@/lib/db'

export async function createPost(sectionId: string, userId: string, body: string, parentPostId?: string) {
  const trimmed = body.trim()
  if (!trimmed) {
    throw new Error('Post body cannot be empty')
  }

  const membership = await prisma.threadMembership.findUnique({
    where: { userId_sectionId: { userId, sectionId } },
  })
  if (!membership) {
    throw new Error('You must join this section before posting')
  }

  return prisma.post.create({
    data: { sectionId, userId, body: trimmed, parentPostId },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  })
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- tests/lib/posts.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 9: Add the post Server Action**

Add to `src/app/sections/actions.ts`:
```ts
import { createPost } from '@/lib/posts'

export async function createPostAction(sectionId: string, formData: FormData) {
  const user = await requireUser()
  const body = String(formData.get('body') ?? '')
  const parentPostId = formData.get('parentPostId')
  await createPost(sectionId, user.id, body, parentPostId ? String(parentPostId) : undefined)
  revalidatePath(`/sections/${sectionId}`)
}
```

- [ ] **Step 10: Build the post form and thread page**

`src/components/PostForm.tsx`:
```tsx
'use client'

import { useRef } from 'react'

export function PostForm({
  action,
  parentPostId,
  placeholder = 'Share your thoughts…',
}: {
  action: (formData: FormData) => Promise<void>
  parentPostId?: string
  placeholder?: string
}) {
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await action(formData)
        formRef.current?.reset()
      }}
      className="flex gap-2"
    >
      {parentPostId && <input type="hidden" name="parentPostId" value={parentPostId} />}
      <textarea name="body" placeholder={placeholder} className="flex-1 border px-2 py-1" required />
      <button type="submit" className="bg-brand-700 text-white px-3 py-1 rounded hover:bg-brand-900 self-start">
        Post
      </button>
    </form>
  )
}
```

`src/app/sections/[sectionId]/page.tsx`:
```tsx
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/session'
import { getSectionThread } from '@/lib/sections'
import { PostForm } from '@/components/PostForm'
import { createPostAction } from '../actions'

export default async function SectionThreadPage({ params }: { params: { sectionId: string } }) {
  const user = await requireUser()
  const thread = await getSectionThread(params.sectionId, user.id)

  if (thread.status === 'locked') {
    notFound()
  }

  const topLevel = thread.posts.filter((p) => !p.parentPostId)
  const repliesTo = (postId: string) => thread.posts.filter((p) => p.parentPostId === postId)

  return (
    <main className="mx-auto max-w-2xl p-8 space-y-6">
      <h1 className="text-xl font-semibold text-brand-900">{thread.label}</h1>

      <PostForm action={createPostAction.bind(null, params.sectionId)} />

      <ul className="space-y-4">
        {topLevel.map((post) => (
          <li key={post.id} className="border rounded p-3">
            <p className="text-sm text-brand-500">{post.user.name ?? 'Member'}</p>
            <p>{post.body}</p>
            <ul className="mt-2 ml-4 space-y-2 border-l pl-4">
              {repliesTo(post.id).map((reply) => (
                <li key={reply.id}>
                  <p className="text-sm text-brand-500">{reply.user.name ?? 'Member'}</p>
                  <p>{reply.body}</p>
                </li>
              ))}
            </ul>
            <div className="mt-2 ml-4">
              <PostForm
                action={createPostAction.bind(null, params.sectionId)}
                parentPostId={post.id}
                placeholder="Reply…"
              />
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
```

A locked section resolves to Next.js's built-in 404 page (`notFound()`) rather than a custom message — visiting the URL for a section you haven't joined must not reveal the section exists or leak anything about it, so a generic not-found response is the correct behavior, not an accident.

- [ ] **Step 11: Manually verify end-to-end**

Run: `npm run dev`, sign in, join a section from the home page, post a message, reply to it, confirm both appear correctly ordered. Then, as a second (or logged-out/different) allow-listed account that hasn't joined that section, try visiting `/sections/[that-id]` directly.
Expected: the second account gets a 404, not the thread content.

- [ ] **Step 12: Commit**

```bash
git add src/lib/sections.ts src/lib/posts.ts src/app/sections/[sectionId] src/app/sections/actions.ts src/components/PostForm.tsx tests/lib/sections.test.ts tests/lib/posts.test.ts
git commit -m "feat: add section thread view, posting, and threaded replies"
```

---

## Task 8: Past Books Archive

This task composes already-tested lib functions (`listBooks`, `getSectionsForViewer`) into a page — no new business logic, so it's verified manually rather than with a new automated test, consistent with the approved testing scope.

**Files:**
- Create: `src/app/past-books/page.tsx`

**Interfaces:**
- Consumes: `listBooks` from `@/lib/books` (Task 4), `getSectionsForViewer` from `@/lib/sections` (Task 5), `requireUser` from `@/lib/session` (Task 3).

- [ ] **Step 1: Build the page**

`src/app/past-books/page.tsx`:
```tsx
import Link from 'next/link'
import { requireUser } from '@/lib/session'
import { listBooks } from '@/lib/books'
import { getSectionsForViewer } from '@/lib/sections'
import { JoinSectionButton } from '@/components/JoinSectionButton'
import { joinSectionAction } from '@/app/sections/actions'

export default async function PastBooksPage() {
  const user = await requireUser()
  const books = await listBooks('past')

  return (
    <main className="mx-auto max-w-2xl p-8 space-y-8">
      <h1 className="text-xl font-semibold text-brand-900">Past books</h1>
      {books.length === 0 && <p className="text-brand-500">No past books yet.</p>}
      {await Promise.all(
        books.map(async (book) => {
          const sections = await getSectionsForViewer(book.id, user.id)
          return (
            <section key={book.id}>
              <h2 className="font-medium">
                {book.title} <span className="text-brand-500">by {book.author}</span>
              </h2>
              <ul className="space-y-2 mt-2">
                {sections.map((section) => (
                  <li key={section.id} className="border rounded p-3 flex items-center justify-between">
                    {section.status === 'locked' ? (
                      <JoinSectionButton
                        label={section.label}
                        action={async () => {
                          'use server'
                          await joinSectionAction(section.id)
                        }}
                      />
                    ) : (
                      <Link href={`/sections/${section.id}`} className="text-brand-700 underline">
                        {section.label} ({section.postCount} posts)
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )
        })
      )}
    </main>
  )
}
```

- [ ] **Step 2: Manually verify**

Mark a book as "past" from `/admin`, then visit `/past-books`.
Expected: the book appears with the same locked/unlocked section behavior as the home page, and joining/reading works identically.

- [ ] **Step 3: Commit**

```bash
git add src/app/past-books
git commit -m "feat: add past books archive page"
```

---

## Task 9: Deployment Configuration

Infrastructure and documentation — no automated tests.

**Files:**
- Create: `deploy/bookclub.service`
- Create: `deploy/nginx.conf.example`
- Create: `README.md`

- [ ] **Step 1: Write the systemd unit**

`deploy/bookclub.service`:
```ini
[Unit]
Description=Book Club App
After=network.target

[Service]
Type=simple
User=bookclub
WorkingDirectory=/opt/bookclub
EnvironmentFile=/opt/bookclub/.env
ExecStart=/usr/bin/npm run start
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

- [ ] **Step 2: Write the nginx config**

`deploy/nginx.conf.example`:
```nginx
server {
    listen 80;
    server_name bookclub.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

- [ ] **Step 3: Write the deployment README**

`README.md`:
```markdown
# Book Club App

## Local development

1. `npm install`
2. Copy `.env.example` to `.env` and fill in `DATABASE_URL`, `NEXTAUTH_SECRET`
   (`openssl rand -base64 32`), `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`
   (see below), and `ADMIN_EMAIL` (your own Google account email).
3. `npx prisma db push`
4. `npm run dev`

## Google OAuth setup

1. In the [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
   create a project (or reuse one) and configure the OAuth consent screen.
2. Create an OAuth 2.0 Client ID of type "Web application."
3. Add an authorized redirect URI:
   - Local: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://<your-subdomain>/api/auth/callback/google`
4. Copy the client ID and secret into `.env` (or the production `.env` on the VPS).

## Deploying to your VPS

1. Clone the repo to `/opt/bookclub` on the VPS.
2. `npm ci`
3. Copy `.env.example` to `/opt/bookclub/.env` and fill in production values
   (production `DATABASE_URL`, `NEXTAUTH_URL` set to `https://<your-subdomain>`,
   production Google OAuth credentials, `ADMIN_EMAIL`).
4. `npx prisma migrate deploy`
5. `npm run build`
6. Copy `deploy/bookclub.service` to `/etc/systemd/system/bookclub.service`,
   then `sudo systemctl enable --now bookclub`.
7. Copy `deploy/nginx.conf.example` to your nginx sites config (adjust
   `server_name`), reload nginx, then run `certbot --nginx -d <your-subdomain>`
   to provision TLS.
8. Add a nightly backup cron job for the SQLite file, e.g.:
   `0 3 * * * cp /opt/bookclub/prisma/prod.db /opt/bookclub/backups/prod-$(date +\%F).db`
   (prune old backups periodically).

## Deploying an update

```bash
git pull
npm ci
npx prisma migrate deploy
npm run build
sudo systemctl restart bookclub
```
```

- [ ] **Step 4: Commit**

```bash
git add deploy README.md
git commit -m "docs: add deployment configuration and setup instructions"
```
