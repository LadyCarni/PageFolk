# One current book, with an upcoming status — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Guarantee one current book per club, add an admin-only `upcoming` status for books being prepared, and confirm before swapping the current book.

**Architecture:** Status changes move into two transactional functions in `src/lib/books.ts` (`makeBookCurrent` and `markBookPast`), and `createBook` picks `current` or `upcoming`. Admin actions and the book list call those functions, and a small client button confirms swaps. A pure `canViewBook` guards the book page, the thread redirect and the progress action, so members never reach upcoming books.

**Tech Stack:** Next.js 14 (app router, server actions), React 18, Chakra UI 2, Prisma 5 on SQLite, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-04-one-current-book-design.md`

## Global Constraints

- Branch: `shelf-redesign`. Commit after every task, and end every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Test command: `npm test`, or for one file `npm test -- <path>`. Type check: `npx tsc --noEmit`. Never run `npm run lint`.
- Baseline before Task 1: 31 test files, 271 tests passing; `npx tsc --noEmit` clean.
- No schema change. `Book.status` stays a free-text column holding `'upcoming' | 'current' | 'past'`.
- Exact copy:
  - Badges: "Current", "Upcoming", "Past".
  - Buttons: "Make current", "Mark as past".
  - Confirm: `Make "<title>" the current book? "<current title>" will move to the shelf, and every member will see "<title>" on This month.`
- Upcoming badge: dashed dusty-rose border, transparent background, dusty-rose text.
- No new npm dependencies.

## Review Focus

1. **Making a book current that is already current.** Expected: nothing changes and no other book is touched. Pinned in the Task 1 `makeBookCurrent` tests.
2. **Deleting the only current book.** Expected: the next added book becomes current, not upcoming. Pinned in the Task 1 `createBook` tests.
3. **A member opening an upcoming book's thread link.** Expected: not found, with no redirect that reveals the book's ID. Pinned by the `canViewBook` and `getSectionBook` tests in Task 3, plus the page guard.
4. **A member saving progress on an upcoming book through the server action.** Expected: rejected, with nothing saved and no memberships created. Pinned in the Task 3 action test.
5. **Declining the confirm.** Expected: nothing changes. This is client-only (the submit is cancelled), so it's checked in code review and by hand in Task 4.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `src/lib/books.ts` (modify) | `BookStatus`, `createBook` status choice, `makeBookCurrent`, `markBookPast`; `setBookStatus` removed |
| `src/app/admin/actions.ts` (modify) | `makeBookCurrentAction`, `markBookPastAction`; `setBookStatusAction` removed |
| `src/lib/admin-view.ts` (modify) | `makeCurrentPrompt` (pure) |
| `src/components/MakeCurrentButton.tsx` (create) | client form that confirms before swapping |
| `src/components/AdminBookList.tsx` (modify) | three badges, new buttons |
| `src/lib/book-access.ts` (create) | `canViewBook` (pure) |
| `src/lib/book-view.ts` (modify) | `BookViewData.book.status` |
| `src/lib/sections.ts` (modify) | `getSectionBook` replaces `getSectionBookId` |
| `src/app/shelf/[bookId]/page.tsx`, `src/app/sections/[sectionId]/page.tsx`, `src/app/sections/actions.ts` (modify) | member guards |

---

### Task 1: Status rules and admin actions

**Files:**
- Modify: `src/lib/books.ts` (`listBooks` signature line 17; `createBook` lines 34-38; `setBookStatus` lines 79-81)
- Modify: `src/app/admin/actions.ts` (import line 6; `setBookStatusAction` lines 70-75)
- Modify: `src/components/AdminBookList.tsx` (import line 6; the status form, lines 73-82)
- Test: `tests/lib/books.test.ts`, `tests/app/admin-actions.test.ts`

**Interfaces:**
- Produces:
  - `type BookStatus = 'upcoming' | 'current' | 'past'` (exported from `@/lib/books`)
  - `listBooks(status?: BookStatus)`
  - `createBook(input)`: unchanged signature; the status is now chosen for you
  - `makeBookCurrent(bookId: string): Promise<Book>`
  - `markBookPast(bookId: string): Promise<Book>`
  - `makeBookCurrentAction(bookId: string): Promise<void>` and `markBookPastAction(bookId: string): Promise<void>` (from `@/app/admin/actions`)

- [ ] **Step 1: Write the failing tests**

In `tests/lib/books.test.ts`, replace `setBookStatus,` in the `@/lib/books` import with `makeBookCurrent,` and `markBookPast,`. Replace the existing `'filters by status'` test with the block below, inside `describe('books', ...)`:

```ts
  it('filters by status', async () => {
    const current = await newBook()
    const past = await createBook({ title: 'Old Book', author: 'Someone', totalChapters: 10 })
    await markBookPast(past.id)

    expect((await listBooks('current')).map((b) => b.id)).toEqual([current.id])
    expect((await listBooks('past')).map((b) => b.id)).toEqual([past.id])
  })

  it('makes the first book current, later books upcoming, and a book added with no current book current', async () => {
    const first = await newBook()
    const second = await createBook({ title: 'Emma', author: 'Jane Austen', totalChapters: 30 })
    expect(first.status).toBe('current')
    expect(second.status).toBe('upcoming')

    await markBookPast(first.id)
    const third = await createBook({ title: 'Persuasion', author: 'Jane Austen', totalChapters: 24 })
    expect(third.status).toBe('current')
  })

  it('adds a current book after the only current book is deleted', async () => {
    const only = await newBook()
    await deleteBook(only.id)
    const next = await createBook({ title: 'Emma', author: 'Jane Austen', totalChapters: 30 })
    expect(next.status).toBe('current')
  })

  it('makeBookCurrent moves the old current book to the shelf, from upcoming or from past', async () => {
    const a = await newBook()
    const b = await createBook({ title: 'Emma', author: 'Jane Austen', totalChapters: 30 })
    const status = async (id: string) => (await prisma.book.findUniqueOrThrow({ where: { id } })).status

    await makeBookCurrent(b.id)
    expect([await status(a.id), await status(b.id)]).toEqual(['past', 'current'])

    await makeBookCurrent(a.id)
    expect([await status(a.id), await status(b.id)]).toEqual(['current', 'past'])
  })

  it('makeBookCurrent leaves exactly one current book, heals duplicates, and leaves other upcoming books alone', async () => {
    const make = (title: string, status: string) =>
      prisma.book.create({ data: { title, author: 'A', totalChapters: 10, status } })
    const x = await make('X', 'current')
    const y = await make('Y', 'current')
    const u1 = await make('U1', 'upcoming')
    const u2 = await make('U2', 'upcoming')

    await makeBookCurrent(u1.id)

    const byId = Object.fromEntries((await prisma.book.findMany()).map((b) => [b.id, b.status]))
    expect(byId).toEqual({ [x.id]: 'past', [y.id]: 'past', [u1.id]: 'current', [u2.id]: 'upcoming' })
  })

  it('makeBookCurrent on the book that is already current changes nothing', async () => {
    const a = await newBook()
    const past = await prisma.book.create({ data: { title: 'P', author: 'A', totalChapters: 10, status: 'past' } })

    await makeBookCurrent(a.id)

    expect((await prisma.book.findUniqueOrThrow({ where: { id: a.id } })).status).toBe('current')
    expect((await prisma.book.findUniqueOrThrow({ where: { id: past.id } })).status).toBe('past')
  })
```

In `tests/app/admin-actions.test.ts`, add `makeBookCurrentAction, markBookPastAction` to the `@/app/admin/actions` import, then add inside `describe('admin actions', ...)`:

```ts
  it('rejects status changes for a non-admin', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Forbidden: admin only'))
    await expect(makeBookCurrentAction('b1')).rejects.toThrow('Forbidden')
    await expect(markBookPastAction('b1')).rejects.toThrow('Forbidden')
  })

  it('makes a book current, moving the old one to the shelf, and marks a book past, refreshing the pages', async () => {
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
    const old = await createBook({ title: 'Dune', author: 'Frank Herbert', totalChapters: 30 })
    const next = await createBook({ title: 'Emma', author: 'Jane Austen', totalChapters: 30 })
    const status = async (id: string) => (await prisma.book.findUniqueOrThrow({ where: { id } })).status

    await makeBookCurrentAction(next.id)
    expect([await status(old.id), await status(next.id)]).toEqual(['past', 'current'])
    for (const path of ['/', '/admin', '/shelf']) expect(revalidatePath).toHaveBeenCalledWith(path)

    vi.mocked(revalidatePath).mockClear()
    await markBookPastAction(next.id)
    expect(await status(next.id)).toBe('past')
    for (const path of ['/', '/admin', '/shelf']) expect(revalidatePath).toHaveBeenCalledWith(path)
  })
```

- [ ] **Step 2: Run the tests and see them fail**

Run: `npm test -- tests/lib/books.test.ts tests/app/admin-actions.test.ts`
Expected: FAIL. `markBookPast`, `makeBookCurrent`, `makeBookCurrentAction` and `markBookPastAction` are not functions, and the second book's status is `'current'`, not `'upcoming'`.

- [ ] **Step 3: Implement the status rules**

In `src/lib/books.ts`:

Add, near the top after the imports:

```ts
export type BookStatus = 'upcoming' | 'current' | 'past'
```

Change `export async function listBooks(status?: 'current' | 'past') {` to `export async function listBooks(status?: BookStatus) {`.

Replace `createBook` with:

```ts
// A club has one current book. The first book goes live straight away; later ones wait as upcoming.
export async function createBook(input: { title: string; author: string; totalChapters: number; coverUrl?: string }) {
  const problem = validateTotalChapters(input.totalChapters)
  if (problem) throw new ValidationError(problem)
  return prisma.$transaction(async (tx) => {
    const currentCount = await tx.book.count({ where: { status: 'current' } })
    return tx.book.create({ data: { ...input, status: currentCount === 0 ? 'current' : 'upcoming' } })
  })
}
```

Replace `setBookStatus` with:

```ts
// Every other current book moves to the shelf in the same transaction, so there is never more than one.
export async function makeBookCurrent(bookId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.book.updateMany({ where: { status: 'current', NOT: { id: bookId } }, data: { status: 'past' } })
    return tx.book.update({ where: { id: bookId }, data: { status: 'current' } })
  })
}

export async function markBookPast(bookId: string) {
  return prisma.book.update({ where: { id: bookId }, data: { status: 'past' } })
}
```

In `src/app/admin/actions.ts`, in the `@/lib/books` import replace `setBookStatus` with `makeBookCurrent, markBookPast`, and replace `setBookStatusAction` with:

```ts
export async function makeBookCurrentAction(bookId: string) {
  await requireAdmin()
  await makeBookCurrent(bookId)
  revalidateBookPages()
}

export async function markBookPastAction(bookId: string) {
  await requireAdmin()
  await markBookPast(bookId)
  revalidateBookPages()
}
```

In `src/components/AdminBookList.tsx`, change the import to `import { deleteBookAction, makeBookCurrentAction, markBookPastAction } from '@/app/admin/actions'`. Replace the status form's action body `await setBookStatusAction(book.id, current ? 'past' : 'current')` with:

```ts
                      if (current) await markBookPastAction(book.id)
                      else await makeBookCurrentAction(book.id)
```

and its button label `{current ? 'Mark as past' : 'Mark as current'}` with `{current ? 'Mark as past' : 'Make current'}`. (Task 2 replaces this form with the confirming button.)

- [ ] **Step 4: Run the tests, type check, run the full suite**

Run: `npm test -- tests/lib/books.test.ts tests/app/admin-actions.test.ts && npx tsc --noEmit && npm test`
Expected: PASS; no type errors; the full suite is green. If an existing test elsewhere assumed every new book is current, it now gets `upcoming` for its second book. Fix that test's setup with `makeBookCurrent` or `prisma.book.create({ data: { ..., status } })`, and ledger a ruling naming the test.

- [ ] **Step 5: Commit**

```bash
git add src/lib/books.ts src/app/admin/actions.ts src/components/AdminBookList.tsx tests/lib/books.test.ts tests/app/admin-actions.test.ts
git commit -m "feat: one current book per club; later books start upcoming

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Admin list: Upcoming badge and confirming Make current

**Files:**
- Modify: `src/lib/admin-view.ts`
- Create: `src/components/MakeCurrentButton.tsx`
- Modify: `src/components/AdminBookList.tsx` (`StatusBadge` lines 8-25; the list body)
- Test: `tests/lib/admin-view.test.ts`

**Interfaces:**
- Consumes: `makeBookCurrentAction`, `markBookPastAction` (Task 1).
- Produces: `makeCurrentPrompt(title: string, currentTitle: string): string` and `MakeCurrentButton({ title, currentTitle, action }: { title: string; currentTitle: string | null; action: () => Promise<void> })`.

- [ ] **Step 1: Write the failing test**

Append to `tests/lib/admin-view.test.ts`, and add `makeCurrentPrompt` to its import from `@/lib/admin-view`:

```ts
describe('makeCurrentPrompt', () => {
  it('names the book going live and the one moving to the shelf', () => {
    expect(makeCurrentPrompt('Rebecca', 'The Stand')).toBe(
      'Make "Rebecca" the current book? "The Stand" will move to the shelf, and every member will see "Rebecca" on This month.'
    )
  })
})
```

- [ ] **Step 2: Run it and see it fail**

Run: `npm test -- tests/lib/admin-view.test.ts`
Expected: FAIL. `makeCurrentPrompt` is not a function.

- [ ] **Step 3: Implement the prompt, the button and the badges**

Append to `src/lib/admin-view.ts`:

```ts
// The confirmation shown before a swap replaces what every member sees on This month.
export function makeCurrentPrompt(title: string, currentTitle: string): string {
  return `Make "${title}" the current book? "${currentTitle}" will move to the shelf, and every member will see "${title}" on This month.`
}
```

Create `src/components/MakeCurrentButton.tsx`:

```tsx
'use client'

import { Button } from '@chakra-ui/react'
import { makeCurrentPrompt } from '@/lib/admin-view'

// Asks first when another book is current, because the swap changes This month for every member.
export function MakeCurrentButton({
  title,
  currentTitle,
  action,
}: {
  title: string
  currentTitle: string | null
  action: () => Promise<void>
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (currentTitle && !confirm(makeCurrentPrompt(title, currentTitle))) {
          e.preventDefault()
        }
      }}
    >
      <Button type="submit" size="sm" variant="goldOutline">
        Make current
      </Button>
    </form>
  )
}
```

In `src/components/AdminBookList.tsx`:

Add `import { MakeCurrentButton } from '@/components/MakeCurrentButton'`.

Replace `StatusBadge` with:

```tsx
const BADGES = {
  current: { label: 'Current', borderColor: 'dustyRose', borderStyle: 'solid', bg: 'claret', color: 'antiqueGold' },
  upcoming: { label: 'Upcoming', borderColor: 'dustyRose', borderStyle: 'dashed', bg: 'transparent', color: 'dustyRose' },
  past: { label: 'Past', borderColor: 'borderMuted', borderStyle: 'solid', bg: 'transparent', color: 'mist' },
} as const

function StatusBadge({ status }: { status: string }) {
  const { label, ...look } = BADGES[status as keyof typeof BADGES] ?? BADGES.past
  return (
    <Text as="span" {...LABEL_PROPS} {...look} flexShrink={0} px={3} py={0.5} borderRadius="full" borderWidth="1px">
      {label}
    </Text>
  )
}
```

Inside `AdminBookList`, before the `return`, add:

```ts
  const currentBook = books.find((b) => b.status === 'current') ?? null
```

Change `<StatusBadge current={current} />` to `<StatusBadge status={book.status} />`.

Replace the whole status `<form ...>...</form>` (from Task 1) with:

```tsx
                  {current ? (
                    <form
                      action={async () => {
                        'use server'
                        await markBookPastAction(book.id)
                      }}
                    >
                      <Button type="submit" size="sm" variant="goldOutline">
                        Mark as past
                      </Button>
                    </form>
                  ) : (
                    <MakeCurrentButton
                      title={book.title}
                      currentTitle={currentBook && currentBook.id !== book.id ? currentBook.title : null}
                      action={async () => {
                        'use server'
                        await makeBookCurrentAction(book.id)
                      }}
                    />
                  )}
```

- [ ] **Step 4: Run the test, type check, full suite**

Run: `npm test -- tests/lib/admin-view.test.ts && npx tsc --noEmit && npm test`
Expected: PASS; no type errors; full suite green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin-view.ts src/components/MakeCurrentButton.tsx src/components/AdminBookList.tsx tests/lib/admin-view.test.ts
git commit -m "feat: admin list shows Upcoming and confirms before swapping the current book

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Members cannot reach upcoming books

**Files:**
- Create: `src/lib/book-access.ts`
- Modify: `src/lib/book-view.ts` (type and return value)
- Modify: `src/lib/sections.ts:102-105` (`getSectionBookId` → `getSectionBook`)
- Modify: `src/app/shelf/[bookId]/page.tsx`, `src/app/sections/[sectionId]/page.tsx`, `src/app/sections/actions.ts`
- Test: `tests/lib/book-access.test.ts` (create), `tests/lib/book-view.test.ts`, `tests/lib/sections.test.ts`, `tests/app/section-actions.test.ts`

**Interfaces:**
- Produces:
  - `canViewBook(status: string, isAdmin: boolean): boolean`
  - `BookViewData.book.status: string`
  - `getSectionBook(sectionId: string): Promise<{ bookId: string; status: string } | null>`

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/book-access.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { canViewBook } from '@/lib/book-access'

describe('canViewBook', () => {
  it('lets everyone see current and past books', () => {
    for (const isAdmin of [true, false]) {
      expect(canViewBook('current', isAdmin)).toBe(true)
      expect(canViewBook('past', isAdmin)).toBe(true)
    }
  })

  it('keeps upcoming books to admins', () => {
    expect(canViewBook('upcoming', true)).toBe(true)
    expect(canViewBook('upcoming', false)).toBe(false)
  })
})
```

In `tests/lib/book-view.test.ts`, in the `'returns the book details, blurb and progress'` test, add `status: 'current',` to the expected `data?.book` object (after `coverVersion: null,`).

In `tests/lib/sections.test.ts`, change the import's `getSectionBookId` to `getSectionBook`, and replace the `'finds the book a section belongs to...'` test body's two expectations with:

```ts
    expect(await getSectionBook(sectionId)).toEqual({ bookId: section.bookId, status: 'current' })
    expect(await getSectionBook('does-not-exist')).toBeNull()
```

(The `setup()` there creates its book with `prisma.book.create` and no status, so it gets the default `'current'`.)

Append inside `describe('setProgressAction', ...)` in `tests/app/section-actions.test.ts`:

```ts
  it('refuses a member on an upcoming book, saving nothing, and allows an admin', async () => {
    const { book, user } = await setup()
    await prisma.book.update({ where: { id: book.id }, data: { status: 'upcoming' } })

    mockRequireUser.mockResolvedValue({ id: user.id, isAdmin: false })
    await expect(setProgressAction(book.id, 10)).rejects.toThrow('Not found')
    expect(await prisma.readingProgress.count()).toBe(0)
    expect(await prisma.threadMembership.count()).toBe(0)

    mockRequireUser.mockResolvedValue({ id: user.id, isAdmin: true })
    expect(await setProgressAction(book.id, 10)).toBe(10)
  })
```

- [ ] **Step 2: Run the tests and see them fail**

Run: `npm test -- tests/lib/book-access.test.ts tests/lib/book-view.test.ts tests/lib/sections.test.ts tests/app/section-actions.test.ts`
Expected: FAIL. `@/lib/book-access` cannot be resolved; `status` is missing from the book view; `getSectionBook` is not a function; the member's progress is saved instead of rejected.

- [ ] **Step 3: Implement**

Create `src/lib/book-access.ts`:

```ts
// Upcoming books are being prepared by an admin and stay hidden from members until made current.
export function canViewBook(status: string, isAdmin: boolean): boolean {
  return status !== 'upcoming' || isAdmin
}
```

In `src/lib/book-view.ts`, add `status: string` to `BookViewData['book']` (after `coverVersion`), and `status: book.status,` to the returned `book` object (after `coverVersion`).

In `src/lib/sections.ts`, replace `getSectionBookId` with:

```ts
export async function getSectionBook(sectionId: string): Promise<{ bookId: string; status: string } | null> {
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    select: { bookId: true, book: { select: { status: true } } },
  })
  return section ? { bookId: section.bookId, status: section.book.status } : null
}
```

Replace `src/app/sections/[sectionId]/page.tsx` with:

```tsx
import { notFound, redirect } from 'next/navigation'
import { requireUser } from '@/lib/session'
import { listBooks } from '@/lib/books'
import { canViewBook } from '@/lib/book-access'
import { getSectionBook } from '@/lib/sections'
import { threadHref } from '@/lib/threads'

// Old thread links keep working: they now open the thread inside the three-pane view.
export default async function SectionRedirect({ params }: { params: { sectionId: string } }) {
  const user = await requireUser()
  const section = await getSectionBook(params.sectionId)
  if (!section || !canViewBook(section.status, user.isAdmin)) notFound()
  const [current] = await listBooks('current')
  redirect(threadHref(section.bookId, current?.id ?? null, params.sectionId))
}
```

In `src/app/shelf/[bookId]/page.tsx`, add `import { canViewBook } from '@/lib/book-access'` and change `if (!data) notFound()` to:

```ts
  if (!data || !canViewBook(data.book.status, user.isAdmin)) notFound()
```

In `src/app/sections/actions.ts`, add `import { prisma } from '@/lib/db'` and `import { canViewBook } from '@/lib/book-access'`, and replace `setProgressAction` with:

```ts
export async function setProgressAction(bookId: string, chaptersFinished: number): Promise<number> {
  const user = await requireUser()
  // Progress is how members join threads, so an upcoming book must refuse it before anything is saved.
  const book = await prisma.book.findUnique({ where: { id: bookId }, select: { status: true } })
  if (!book || !canViewBook(book.status, user.isAdmin)) throw new Error('Not found')
  const saved = await setProgress(user.id, bookId, chaptersFinished)
  revalidateBookViews()
  return saved
}
```

- [ ] **Step 4: Run the tests, type check, full suite**

Run: `npm test -- tests/lib/book-access.test.ts tests/lib/book-view.test.ts tests/lib/sections.test.ts tests/app/section-actions.test.ts && npx tsc --noEmit && npm test`
Expected: PASS; no type errors; full suite green. If `tsc` reports that `user.isAdmin` might be undefined in the action, use `Boolean(user.isAdmin)`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/book-access.ts src/lib/book-view.ts src/lib/sections.ts src/app/shelf/\[bookId\]/page.tsx src/app/sections/\[sectionId\]/page.tsx src/app/sections/actions.ts tests/lib/book-access.test.ts tests/lib/book-view.test.ts tests/lib/sections.test.ts tests/app/section-actions.test.ts
git commit -m "feat: upcoming books are admin-only on book pages, thread links and progress

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Final verification

- [ ] **Step 1: Full checks and build**

Run: `npx tsc --noEmit && npm test && npm run build`. Stop any running `npm run dev` first, because the build shares `.next`.
Expected: no type errors, every test passes, and the build succeeds.

- [ ] **Step 2: Hand over the manual checks**

List for the user, to check in the browser at `http://localhost:3002/admin`:
- Adding a book while one is current shows it as **Upcoming** (dashed badge).
- **Make current** on it asks for confirmation naming both books. Cancel changes nothing. OK swaps them, and This month shows the new book.
- **Mark as past** on the current book, then adding a book: the new book is **Current**.
- As a non-admin member (or by reasoning, if no second account exists), `/shelf/<upcoming id>` shows not found.
