# Admin Two-Column Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stacked admin page with the concept's two-column layout. The left column holds club name, add book and the book list. The right column holds the selected book's setup: completion chips, description and cover, and discussion sections with a chapter-coverage bar. Allowed emails move to the Members page for admins.

**Architecture:** `/admin` stays one server-rendered page; the viewed book comes from `?book=ID`, resolved by a pure `pickAdminBook`. Coverage (chips, bar, summary line) all derive from one pure `chapterCoverage` helper in `src/lib/chapters.ts`. Client components exist only where there is local UI state: `SectionsCard` (which row is editing), `BookSetupHeader` (total-chapters edit toggle), `CoverUpload` (upload on choose), and the existing `AdminForm`, which gains a few options. No schema changes.

**Tech Stack:** Next.js 14 (app router, server actions), Prisma 5 + SQLite, Chakra UI v2, FontAwesome (solid icons), Vitest.

**Spec:** `docs/superpowers/specs/2026-10-02-admin-two-column-design.md`

## Global Constraints

- **Before Task 1:** the working tree on `master` has unrelated uncommitted edits (`package.json`, `src/components/NoteItem.tsx`, `src/theme.ts`) and untracked PNGs and `scripts/mock-notes.mjs`. Do this work on a branch in a worktree (superpowers:using-git-worktrees) so none of those are touched or committed.
- Stage files by explicit path. Never `git add -A` or `git add .`.
- Existing theme tokens only (`src/theme.ts`); no new colors. New Button variants (`goldOutline`, `dangerOutline`) are allowed; do **not** override Chakra's built-in `outline` variant (`NoteComposer`'s Starters button uses it).
- Pure logic lives in modules that do not import `@/lib/db` (client components import `src/lib/chapters.ts` and `src/lib/admin-view.ts`). Type-only imports from `@/lib/books` (`import type`) are fine.
- Server components cannot pass functions to client components. Callbacks (`onSuccess`, `onCancel`) are only passed from client components. Server-only inline `'use server'` closures follow the existing pattern.
- Copy, verbatim:
  - "Club admin" / "Name your club, add books and shape the conversations."
  - "Shown in the top bar for every member."
  - "BOOK SETUP" (rendered from "Book setup" with uppercase transform)
  - "Shown on the book page. Keep it spoiler-free."
  - "No cover yet. This placeholder is shown instead."
  - "JPG, PNG or WebP, up to 500 KB." (built from `MAX_COVER_BYTES`)
  - "Each section becomes a conversation thread. Readers unlock it by finishing its last chapter. A name stays hidden until then."
  - "Add a book to start setting it up."
  - "Anyone on this list can sign in with Google."
- Chip accessible names: "Description: done" / "Description: not set", "Cover: done" / "Cover: not set", "Sections: every chapter covered" / "Sections: not all chapters covered".
- Test command: `npm test -- <path>` (runs `pretest`, which resets `test.db`). Type check: `npx tsc --noEmit`. Lint: `npm run lint`.
- Check the UI with plain `npm run dev` (port 3002), not `--turbo`.

## Review Focus

1. **Sections arriving out of order, single-chapter sections, and a gap at chapter 1:** coverage, gaps and the summary must still be right. Pinned in Task 1 (`chapterCoverage` unsorted/start-gap tests, `formatGaps` single-chapter test).
2. **Odd `?book=` values** (unknown ID, a just-deleted book, an array from `?book=a&book=b`, no books at all): the page falls back to the default book or the empty state and never crashes. Pinned in Task 1 (`pickAdminBook` tests) and the page's string-only normalization in Task 4.
3. **Grammar at the edges:** 1 of N chapters ("is"), a one-chapter book, two gaps ("chapters 4 and 9 to 12"). Pinned in Task 1 (`coverageSummary`, `formatGaps`).
4. **Add section when every chapter is already covered:** From starts empty (no `undefined` text, no crash). Pinned in Task 1 (`gaps` is `[]` when complete) and used as `coverage.gaps[0]?.start` in Task 7.
5. **A failed create must not navigate:** `createBookAction` with a validation error returns `{ error }` and does not redirect. Pinned in Task 2.

---

### Task 1: Pure helpers — chapter coverage and book selection

**Files:**
- Modify: `src/lib/chapters.ts` (append)
- Create: `src/lib/admin-view.ts`
- Modify: `src/lib/books.ts` (add a type export after `listBooks`)
- Test: `tests/lib/chapters.test.ts` (append), `tests/lib/admin-view.test.ts` (new)

**Interfaces:**
- Produces:
  - `type ChapterRange = { start: number; end: number }`
  - `type Coverage = { covered: number; total: number; complete: boolean; gaps: ChapterRange[]; segments: (ChapterRange & { covered: boolean })[] }`
  - `chapterCoverage(totalChapters: number, sections: { startChapter: number; endChapter: number }[]): Coverage`
  - `formatGaps(gaps: ChapterRange[]): string`
  - `coverageSummary(coverage: Coverage): { lead: string; rest: string }`
  - `pickAdminBook<T extends { id: string; status: string }>(books: T[], requestedId?: string): { book: T | null; explicit: boolean }`
  - `type AdminBook = Awaited<ReturnType<typeof listBooks>>[number]` (from `@/lib/books`)

- [ ] **Step 1: Write the failing tests for coverage**

Add `chapterCoverage, formatGaps, coverageSummary` to the import list at the top of `tests/lib/chapters.test.ts`, then append:

```ts
describe('chapterCoverage', () => {
  it('is one uncovered segment when there are no sections', () => {
    expect(chapterCoverage(38, [])).toEqual({
      covered: 0,
      total: 38,
      complete: false,
      gaps: [{ start: 1, end: 38 }],
      segments: [{ start: 1, end: 38, covered: false }],
    })
  })

  it('is complete with no gaps when sections cover every chapter', () => {
    const c = chapterCoverage(10, [
      { startChapter: 1, endChapter: 4 },
      { startChapter: 5, endChapter: 10 },
    ])
    expect(c.complete).toBe(true)
    expect(c.covered).toBe(10)
    expect(c.gaps).toEqual([])
    expect(c.segments).toEqual([
      { start: 1, end: 4, covered: true },
      { start: 5, end: 10, covered: true },
    ])
  })

  it('finds a gap at the end, as in the concept', () => {
    const c = chapterCoverage(38, [
      { startChapter: 1, endChapter: 5 },
      { startChapter: 6, endChapter: 10 },
      { startChapter: 11, endChapter: 15 },
    ])
    expect(c.covered).toBe(15)
    expect(c.complete).toBe(false)
    expect(c.gaps).toEqual([{ start: 16, end: 38 }])
    expect(c.segments.at(-1)).toEqual({ start: 16, end: 38, covered: false })
  })

  it('finds gaps at the start and in the middle, whatever order sections arrive in', () => {
    const c = chapterCoverage(20, [
      { startChapter: 12, endChapter: 20 },
      { startChapter: 3, endChapter: 8 },
    ])
    expect(c.gaps).toEqual([
      { start: 1, end: 2 },
      { start: 9, end: 11 },
    ])
    expect(c.segments).toEqual([
      { start: 1, end: 2, covered: false },
      { start: 3, end: 8, covered: true },
      { start: 9, end: 11, covered: false },
      { start: 12, end: 20, covered: true },
    ])
    expect(c.covered).toBe(15)
  })

  it('counts single-chapter sections and single-chapter gaps', () => {
    const c = chapterCoverage(3, [
      { startChapter: 1, endChapter: 1 },
      { startChapter: 3, endChapter: 3 },
    ])
    expect(c.covered).toBe(2)
    expect(c.gaps).toEqual([{ start: 2, end: 2 }])
  })
})

describe('formatGaps', () => {
  it('is empty with no gaps', () => {
    expect(formatGaps([])).toBe('')
  })

  it('names one range, or one chapter in the singular', () => {
    expect(formatGaps([{ start: 16, end: 38 }])).toBe('chapters 16 to 38')
    expect(formatGaps([{ start: 4, end: 4 }])).toBe('chapter 4')
  })

  it('joins two gaps with "and" and more with commas', () => {
    expect(formatGaps([{ start: 4, end: 4 }, { start: 9, end: 12 }])).toBe('chapters 4 and 9 to 12')
    expect(
      formatGaps([
        { start: 4, end: 4 },
        { start: 9, end: 12 },
        { start: 30, end: 38 },
      ])
    ).toBe('chapters 4, 9 to 12 and 30 to 38')
  })
})

describe('coverageSummary', () => {
  it('says there are no sections yet', () => {
    expect(coverageSummary(chapterCoverage(38, []))).toEqual({ lead: 'No sections yet.', rest: '' })
  })

  it('counts covered chapters and lists what is missing', () => {
    const c = chapterCoverage(38, [{ startChapter: 1, endChapter: 15 }])
    expect(coverageSummary(c)).toEqual({
      lead: '15 of 38 chapters are in a section.',
      rest: 'Not yet covered: chapters 16 to 38.',
    })
  })

  it('uses "is" for a single covered chapter', () => {
    const c = chapterCoverage(5, [{ startChapter: 2, endChapter: 2 }])
    expect(coverageSummary(c).lead).toBe('1 of 5 chapters is in a section.')
  })

  it('says everything is covered when complete', () => {
    expect(coverageSummary(chapterCoverage(38, [{ startChapter: 1, endChapter: 38 }]))).toEqual({
      lead: 'All 38 chapters are in a section.',
      rest: '',
    })
    expect(coverageSummary(chapterCoverage(1, [{ startChapter: 1, endChapter: 1 }])).lead).toBe(
      'The one chapter is in a section.'
    )
  })
})
```

- [ ] **Step 2: Write the failing tests for book selection**

Create `tests/lib/admin-view.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { pickAdminBook } from '@/lib/admin-view'

// Newest first, as listBooks() returns them.
const books = [
  { id: 'past-new', status: 'past' },
  { id: 'current', status: 'current' },
  { id: 'past-old', status: 'past' },
]

describe('pickAdminBook', () => {
  it('picks the requested book and marks the choice explicit', () => {
    expect(pickAdminBook(books, 'past-old')).toEqual({ book: books[2], explicit: true })
  })

  it('falls back to the first current book for no request or an unknown ID', () => {
    expect(pickAdminBook(books)).toEqual({ book: books[1], explicit: false })
    expect(pickAdminBook(books, 'deleted-id')).toEqual({ book: books[1], explicit: false })
  })

  it('falls back to the newest book when none is current', () => {
    const allPast = [books[0], books[2]]
    expect(pickAdminBook(allPast, 'nope')).toEqual({ book: books[0], explicit: false })
  })

  it('is null when there are no books', () => {
    expect(pickAdminBook([], 'anything')).toEqual({ book: null, explicit: false })
  })
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test -- tests/lib/chapters.test.ts tests/lib/admin-view.test.ts`
Expected: FAIL. `chapterCoverage`/`formatGaps`/`coverageSummary` are not exported, and `@/lib/admin-view` cannot be resolved.

- [ ] **Step 4: Implement the coverage helpers**

Append to `src/lib/chapters.ts`:

```ts
export type ChapterRange = { start: number; end: number }

export type Coverage = {
  covered: number
  total: number
  complete: boolean
  gaps: ChapterRange[]
  segments: (ChapterRange & { covered: boolean })[]
}

// How much of the book the sections cover. Sections never overlap (the server enforces it)
// but may arrive in any order. Segments run 1..total, sections and gaps together.
export function chapterCoverage(
  totalChapters: number,
  sections: { startChapter: number; endChapter: number }[]
): Coverage {
  const sorted = [...sections].sort((a, b) => a.startChapter - b.startChapter)
  const segments: Coverage['segments'] = []
  let next = 1
  for (const s of sorted) {
    if (s.startChapter > next) segments.push({ start: next, end: s.startChapter - 1, covered: false })
    segments.push({ start: s.startChapter, end: s.endChapter, covered: true })
    next = s.endChapter + 1
  }
  if (next <= totalChapters) segments.push({ start: next, end: totalChapters, covered: false })

  const gaps = segments.filter((s) => !s.covered).map(({ start, end }) => ({ start, end }))
  const covered = segments.filter((s) => s.covered).reduce((n, s) => n + s.end - s.start + 1, 0)
  return { covered, total: totalChapters, complete: covered === totalChapters, gaps, segments }
}

// "chapters 16 to 38", "chapter 4", "chapters 4, 9 to 12 and 30 to 38".
export function formatGaps(gaps: ChapterRange[]): string {
  if (gaps.length === 0) return ''
  const parts = gaps.map((g) => (g.start === g.end ? `${g.start}` : `${g.start} to ${g.end}`))
  const noun = gaps.length === 1 && gaps[0].start === gaps[0].end ? 'chapter' : 'chapters'
  const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
  return `${noun} ${list}`
}

// The line under the coverage bar: a bold lead and the rest.
export function coverageSummary(coverage: Coverage): { lead: string; rest: string } {
  const { covered, total, complete, gaps } = coverage
  if (covered === 0) return { lead: 'No sections yet.', rest: '' }
  if (complete) {
    return { lead: total === 1 ? 'The one chapter is in a section.' : `All ${total} chapters are in a section.`, rest: '' }
  }
  return {
    lead: `${covered} of ${total} chapters ${covered === 1 ? 'is' : 'are'} in a section.`,
    rest: `Not yet covered: ${formatGaps(gaps)}.`,
  }
}
```

- [ ] **Step 5: Implement book selection and the book type**

Create `src/lib/admin-view.ts`:

```ts
// Which book the admin page's right column shows. `books` is newest first, as listBooks() returns.
// The requested book when it exists; otherwise the first current book, then the newest book.
// `explicit` is true only when the URL named a real book (small screens then show its setup).
export function pickAdminBook<T extends { id: string; status: string }>(
  books: T[],
  requestedId?: string
): { book: T | null; explicit: boolean } {
  const requested = requestedId ? books.find((b) => b.id === requestedId) : undefined
  if (requested) return { book: requested, explicit: true }
  return { book: books.find((b) => b.status === 'current') ?? books[0] ?? null, explicit: false }
}
```

In `src/lib/books.ts`, directly after the `listBooks` function, add:

```ts
export type AdminBook = Awaited<ReturnType<typeof listBooks>>[number]
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test -- tests/lib/chapters.test.ts tests/lib/admin-view.test.ts`
Expected: PASS (all existing chapter tests too).

- [ ] **Step 7: Commit**

```bash
git add src/lib/chapters.ts src/lib/admin-view.ts src/lib/books.ts tests/lib/chapters.test.ts tests/lib/admin-view.test.ts
git commit -m "feat: chapter coverage and admin book selection helpers"
```

---

### Task 2: Actions — redirect to a new book, allowed emails revalidate Members

**Files:**
- Modify: `src/app/admin/actions.ts` (`createBookAction`, `addAllowedEmailAction`, `removeAllowedEmailAction`)
- Test: `tests/app/admin-actions.test.ts`

**Interfaces:**
- Produces: `createBookAction(formData): Promise<FormResult>`. On success it calls `redirect('/admin?book=<id>')` from `next/navigation`; on a validation error it returns `{ error }` and does not redirect. The allowed-email actions revalidate `/members` instead of `/admin/allowed-emails`.

- [ ] **Step 1: Write the failing tests**

In `tests/app/admin-actions.test.ts`, under the existing `vi.mock('next/cache', ...)` line, add:

```ts
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
```

and below the existing imports:

```ts
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
```

Also add `removeAllowedEmailAction` to the `@/app/admin/actions` import. In `beforeEach`, add `vi.mocked(redirect).mockClear()` and `vi.mocked(revalidatePath).mockClear()`. Then replace the body of `it('creates a book for an admin', ...)` and append new tests in the `describe`:

```ts
  it('creates a book for an admin and opens it', async () => {
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
    const fd = new FormData()
    fd.set('title', 'Dune')
    fd.set('author', 'Frank Herbert')
    fd.set('totalChapters', '30')
    expect(await createBookAction(fd)).toEqual({})
    const [book] = await prisma.book.findMany()
    expect(book).toMatchObject({ title: 'Dune', totalChapters: 30 })
    expect(redirect).toHaveBeenCalledWith(`/admin?book=${book.id}`)
  })

  it('does not redirect when a new book is rejected', async () => {
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
    const fd = new FormData()
    fd.set('title', 'Dune')
    fd.set('author', 'Frank Herbert')
    fd.set('totalChapters', '0')
    expect(await createBookAction(fd)).toEqual({ error: 'Total chapters must be a whole number of at least 1' })
    expect(redirect).not.toHaveBeenCalled()
  })

  it('refreshes the Members page when allowed emails change', async () => {
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
    const fd = new FormData()
    fd.set('email', 'New@Example.com')
    await addAllowedEmailAction(fd)
    expect(await prisma.allowedEmail.findMany()).toEqual([expect.objectContaining({ email: 'new@example.com' })])
    expect(revalidatePath).toHaveBeenCalledWith('/members')

    vi.mocked(revalidatePath).mockClear()
    await removeAllowedEmailAction('new@example.com')
    expect(await prisma.allowedEmail.count()).toBe(0)
    expect(revalidatePath).toHaveBeenCalledWith('/members')
  })

  it('rejects removeAllowedEmailAction for a non-admin', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Forbidden: admin only'))
    await expect(removeAllowedEmailAction('a@example.com')).rejects.toThrow('Forbidden')
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/app/admin-actions.test.ts`
Expected: FAIL. `redirect` is not called, and `revalidatePath` is called with `/admin/allowed-emails`, not `/members`.

- [ ] **Step 3: Implement**

In `src/app/admin/actions.ts`, add `import { redirect } from 'next/navigation'` beside the `next/cache` import. Replace `createBookAction` with:

```ts
export async function createBookAction(formData: FormData): Promise<FormResult> {
  await requireAdmin()
  const title = String(formData.get('title') ?? '').trim()
  const author = String(formData.get('author') ?? '').trim()
  let bookId: string | null = null
  const result = await reportingValidation(async () => {
    if (!title || !author) {
      throw new ValidationError('Title and author are required')
    }
    const book = await createBook({ title, author, totalChapters: parseWholeNumber(formData.get('totalChapters')) })
    bookId = book.id
    revalidatePath('/admin')
  })
  // Outside reportingValidation: redirect() works by throwing, and must not be caught there.
  if (bookId) redirect(`/admin?book=${bookId}`)
  return result
}
```

In `addAllowedEmailAction` and `removeAllowedEmailAction`, change `revalidatePath('/admin/allowed-emails')` to `revalidatePath('/members')`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/app/admin-actions.test.ts`
Expected: PASS (all existing action tests too).

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/actions.ts tests/app/admin-actions.test.ts
git commit -m "feat: open a new book after adding it; allowed emails refresh Members"
```

---

### Task 3: Button variants, AdminForm options, restyled delete buttons

There is no component test setup (Vitest runs in `node`), so this task is checked by type check and lint, and visually in Tasks 4 to 7. The old admin page keeps working through this task because every new prop is optional. The `solid` prop is replaced by `submitVariant`, and the old page's two `solid` usages are updated.

**Files:**
- Modify: `src/theme.ts` (Button variants)
- Modify: `src/components/AdminForm.tsx` (full rewrite below)
- Modify: `src/components/DeleteBookButton.tsx`, `src/components/DeleteSectionButton.tsx` (button style)
- Create: `src/components/adminStyles.ts`
- Modify: `src/app/admin/page.tsx` (`solid` → `submitVariant="solid"`, two places)

**Interfaces:**
- Produces:
  - Button variants `goldOutline` and `dangerOutline`.
  - `AdminForm` props: `action`, `rule`, `mode`, `submitLabel`, `submitIcon?: ReactNode`, `submitVariant?: 'link' | 'solid' | 'goldOutline'` (default `'link'`), `submitWidth?`, `showSaved?: boolean`, `hiddenFields?`, `mt?`, `layout?: 'row' | 'custom'` (default `'row'`), `onSuccess?: () => void`, `onCancel?: () => void`, `children`.
  - `AdminFormActions`: placed inside the children of a `layout="custom"` form to position the Save/Cancel/Saved controls.
  - `CARD_PROPS` and `LABEL_PROPS` from `@/components/adminStyles`.

- [ ] **Step 1: Add the Button variants**

In `src/theme.ts`, inside `components.Button.variants`, after `link`, add:

```ts
        goldOutline: {
          borderWidth: '1px',
          borderColor: 'antiqueGold',
          color: 'antiqueGold',
          bg: 'transparent',
          borderRadius: 'full',
          _hover: { bg: 'mulberry', _disabled: { bg: 'transparent' } },
        },
        dangerOutline: {
          borderWidth: '1px',
          borderColor: 'danger',
          color: 'danger',
          bg: 'transparent',
          borderRadius: 'full',
          _hover: { bg: 'mulberry' },
        },
```

- [ ] **Step 2: Add shared admin styles**

Create `src/components/adminStyles.ts`:

```ts
// Shared look for the admin page's cards and small uppercase labels.
export const CARD_PROPS = {
  bg: 'velvet',
  borderWidth: '1px',
  borderColor: 'border',
  borderRadius: '2xl',
  p: { base: 5, md: 7 },
} as const

export const LABEL_PROPS = { fontSize: 'xs', letterSpacing: '0.14em', textTransform: 'uppercase' } as const
```

- [ ] **Step 3: Rewrite AdminForm**

Replace `src/components/AdminForm.tsx` with:

```tsx
'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { Button, HStack, Text } from '@chakra-ui/react'
import { validateFormValues, type FormRule } from '@/lib/chapters'
import type { FormResult } from '@/app/admin/actions'

type SubmitVariant = 'link' | 'solid' | 'goldOutline'
type FormState = FormResult & { saved?: boolean }

function SubmitButton({
  label,
  icon,
  disabled,
  variant,
  width,
}: {
  label: string
  icon?: ReactNode
  disabled: boolean
  variant: SubmitVariant
  width?: string
}) {
  const { pending } = useFormStatus()
  if (variant === 'link') {
    return (
      <Button type="submit" size="sm" variant="link" flexShrink={0} isDisabled={disabled || pending}>
        {label}
      </Button>
    )
  }
  return (
    <Button
      type="submit"
      variant={variant}
      leftIcon={icon ? <>{icon}</> : undefined}
      borderRadius="full"
      px={6}
      w={width}
      flexShrink={0}
      isDisabled={disabled || pending}
    >
      {label}
    </Button>
  )
}

const ActionsContext = createContext<ReactNode>(null)

// Puts the form's Save / Cancel / Saved controls at this spot inside a layout="custom" form.
export function AdminFormActions() {
  return <>{useContext(ActionsContext)}</>
}

// An admin form that checks its own values as you type, using the same rules as the server.
// Save is disabled until something has changed and the values are valid; edit forms show
// Cancel beside it once a field differs from its saved value (always, when onCancel is given).
// The server check stays as a backstop and its message shows under the form if it ever rejects.
// layout="row" lays the fields and controls out in one row; layout="custom" leaves the layout to
// the children, which place <AdminFormActions /> where the controls should go.
export function AdminForm({
  action,
  rule,
  mode,
  submitLabel,
  submitIcon,
  submitVariant = 'link',
  submitWidth,
  showSaved,
  hiddenFields,
  mt,
  layout = 'row',
  onSuccess,
  onCancel,
  children,
}: {
  action: (formData: FormData) => Promise<FormResult>
  rule: FormRule
  mode: 'edit' | 'create'
  submitLabel: string
  submitIcon?: ReactNode
  submitVariant?: SubmitVariant
  submitWidth?: string
  showSaved?: boolean
  hiddenFields?: Record<string, string>
  mt?: string | number
  layout?: 'row' | 'custom'
  onSuccess?: () => void
  onCancel?: () => void
  children: ReactNode
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [serverState, formAction] = useFormState(async (_previous: FormState, formData: FormData): Promise<FormState> => {
    const result = await action(formData)
    return result.error ? result : { saved: true }
  }, {})
  const [changed, setChanged] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [editedSinceSubmit, setEditedSinceSubmit] = useState(false)

  function evaluate() {
    const form = formRef.current
    if (!form) return
    const values: Record<string, string> = {}
    let differs = false
    for (const element of Array.from(form.elements)) {
      if (
        (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) &&
        element.name &&
        element.type !== 'hidden'
      ) {
        values[element.name] = element.value
        if (element.value !== element.defaultValue) differs = true
      }
    }
    setChanged(differs)
    setProblem(validateFormValues(rule, values))
  }

  // Re-check after every render so saved values arriving from the server settle the form.
  useEffect(evaluate)
  useEffect(() => setEditedSinceSubmit(false), [serverState])
  // After a successful save: clear a create form, and let the parent react (e.g. close an inline form).
  useEffect(() => {
    if (!serverState.saved) return
    if (mode === 'create') formRef.current?.reset()
    onSuccess?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverState])

  function cancel() {
    formRef.current?.reset()
    setEditedSinceSubmit(true)
    evaluate()
    onCancel?.()
  }

  const clientMessage = changed ? problem : null
  const message = clientMessage ?? (editedSinceSubmit ? null : serverState.error ?? null)
  const canSubmit = changed && problem === null

  const actions = (
    <HStack spacing={3} flexShrink={0}>
      <SubmitButton
        label={submitLabel}
        icon={submitIcon}
        disabled={!canSubmit}
        variant={submitVariant}
        width={submitWidth}
      />
      {(onCancel || (mode === 'edit' && changed)) && (
        <Button type="button" size="sm" variant="link" color="mist" flexShrink={0} onClick={cancel}>
          Cancel
        </Button>
      )}
      {showSaved && serverState.saved && !changed && (
        <Text role="status" fontSize="sm" color="mist">
          Saved
        </Text>
      )}
    </HStack>
  )

  return (
    <form
      ref={formRef}
      action={formAction}
      onInput={() => {
        setEditedSinceSubmit(true)
        evaluate()
      }}
    >
      {Object.entries(hiddenFields ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {layout === 'custom' ? (
        <ActionsContext.Provider value={actions}>{children}</ActionsContext.Provider>
      ) : (
        <HStack mt={mt}>
          {children}
          {actions}
        </HStack>
      )}
      {message && (
        <Text role="alert" mt={1} fontSize="sm" color="danger">
          {message}
        </Text>
      )}
    </form>
  )
}
```

- [ ] **Step 4: Restyle the delete buttons**

In `src/components/DeleteBookButton.tsx`, change the button to:

```tsx
      <Button type="submit" size="sm" variant="dangerOutline">
        Delete book
      </Button>
```

In `src/components/DeleteSectionButton.tsx`, change the button to:

```tsx
      <Button type="submit" size="sm" variant="dangerOutline">
        Delete
      </Button>
```

- [ ] **Step 5: Update the two `solid` usages in the old admin page**

In `src/app/admin/page.tsx`, replace both `solid` props on `AdminForm` (the "Add book" and "Add section" forms) with `submitVariant="solid"`.

- [ ] **Step 6: Type check, lint, and run the full suite**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: no type errors, no lint errors, all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/theme.ts src/components/adminStyles.ts src/components/AdminForm.tsx src/components/DeleteBookButton.tsx src/components/DeleteSectionButton.tsx src/app/admin/page.tsx
git commit -m "feat: AdminForm layout, saved and callback options; gold and danger outline buttons"
```

---

### Task 4: Two-column admin page and the left column

This replaces the old page. Until Tasks 5 to 7, the right column shows only the book's label and title. Each later task adds one part of it to `BookSetup`.

**Files:**
- Modify: `src/app/admin/page.tsx` (full rewrite)
- Create: `src/components/AdminBookList.tsx`
- Create: `src/components/BookSetup.tsx`

**Interfaces:**
- Consumes: `pickAdminBook` (`@/lib/admin-view`), `AdminBook` and `listBooks` (`@/lib/books`), `AdminForm` and `AdminFormActions`, `CARD_PROPS` and `LABEL_PROPS`, `NAV_HEIGHT_PX` (`@/lib/layout`).
- Produces:
  - `AdminBookList({ books: AdminBook[]; selectedId: string | null })` (server component)
  - `BookSetup({ book: AdminBook })` (server component; grows in Tasks 5 to 7)

- [ ] **Step 1: Create the book list**

Create `src/components/AdminBookList.tsx`:

```tsx
import NextLink from 'next/link'
import { Box, Button, Flex, Heading, HStack, Link, Text, VStack } from '@chakra-ui/react'
import type { AdminBook } from '@/lib/books'
import { DeleteBookButton } from '@/components/DeleteBookButton'
import { LABEL_PROPS } from '@/components/adminStyles'
import { deleteBookAction, setBookStatusAction } from '@/app/admin/actions'

function StatusBadge({ current }: { current: boolean }) {
  return (
    <Text
      as="span"
      {...LABEL_PROPS}
      flexShrink={0}
      px={3}
      py={0.5}
      borderRadius="full"
      borderWidth="1px"
      borderColor={current ? 'dustyRose' : 'borderMuted'}
      bg={current ? 'claret' : 'transparent'}
      color={current ? 'antiqueGold' : 'mist'}
    >
      {current ? 'Current' : 'Past'}
    </Text>
  )
}

// "Your books": every book, newest first. The title opens its setup on the right.
export function AdminBookList({ books, selectedId }: { books: AdminBook[]; selectedId: string | null }) {
  return (
    <Box as="section" aria-labelledby="your-books-heading">
      <Heading as="h2" id="your-books-heading" size="lg" mb={4}>
        Your books
      </Heading>
      {books.length === 0 ? (
        <Text color="mist" fontStyle="italic">
          No books yet.
        </Text>
      ) : (
        <VStack as="ul" listStyleType="none" align="stretch" spacing={4} m={0} p={0}>
          {books.map((book) => {
            const selected = book.id === selectedId
            const current = book.status === 'current'
            return (
              <Box
                as="li"
                key={book.id}
                p={5}
                bg={selected ? 'bubbleMine' : 'mulberry'}
                borderWidth="1px"
                borderColor={selected ? 'antiqueGold' : 'borderOpen'}
                borderRadius="xl"
                aria-current={selected ? 'true' : undefined}
              >
                <Flex justify="space-between" align="flex-start" gap={3}>
                  <Box minW={0}>
                    <Link
                      as={NextLink}
                      href={`/admin?book=${book.id}`}
                      color="parchment"
                      fontFamily="heading"
                      fontSize="2xl"
                      fontWeight={600}
                    >
                      {book.title}
                    </Link>
                    <Text fontSize="sm" color="mist">
                      {book.author}, {book.totalChapters} chapters
                    </Text>
                  </Box>
                  <StatusBadge current={current} />
                </Flex>
                <HStack mt={4} spacing={3} flexWrap="wrap">
                  <form
                    action={async () => {
                      'use server'
                      await setBookStatusAction(book.id, current ? 'past' : 'current')
                    }}
                  >
                    <Button type="submit" size="sm" variant="goldOutline">
                      {current ? 'Mark as past' : 'Mark as current'}
                    </Button>
                  </form>
                  <DeleteBookButton
                    title={book.title}
                    sectionCount={book.sections.length}
                    postCount={book.sections.reduce((n, s) => n + s._count.posts, 0)}
                    action={async () => {
                      'use server'
                      await deleteBookAction(book.id)
                    }}
                  />
                </HStack>
              </Box>
            )
          })}
        </VStack>
      )}
    </Box>
  )
}
```

- [ ] **Step 2: Create the first version of BookSetup**

Create `src/components/BookSetup.tsx`:

```tsx
import { Heading, Text, VStack } from '@chakra-ui/react'
import type { AdminBook } from '@/lib/books'
import { LABEL_PROPS } from '@/components/adminStyles'

// The right column of the admin page: everything to set up one book.
export function BookSetup({ book }: { book: AdminBook }) {
  return (
    <VStack align="stretch" spacing={8} p={{ base: 6, md: 10 }}>
      <div>
        <Text {...LABEL_PROPS} color="dustyRose">
          Book setup
        </Text>
        <Heading as="h1" size="2xl" mt={1}>
          {book.title}
        </Heading>
      </div>
    </VStack>
  )
}
```

- [ ] **Step 3: Rewrite the admin page**

Replace `src/app/admin/page.tsx` with:

```tsx
import NextLink from 'next/link'
import { Box, Flex, Grid, Heading, Input, Link, Text, VStack } from '@chakra-ui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faPlus } from '@fortawesome/free-solid-svg-icons'
import { requireAdmin } from '@/lib/session'
import { listBooks } from '@/lib/books'
import { getClubName } from '@/lib/club'
import { pickAdminBook } from '@/lib/admin-view'
import { NAV_HEIGHT_PX } from '@/lib/layout'
import { AdminForm, AdminFormActions } from '@/components/AdminForm'
import { AdminBookList } from '@/components/AdminBookList'
import { BookSetup } from '@/components/BookSetup'
import { CARD_PROPS, LABEL_PROPS } from '@/components/adminStyles'
import { createBookAction, updateClubNameAction } from './actions'

function FieldLabel({ children }: { children: string }) {
  return (
    <Text fontSize="sm" color="parchment" mb={1}>
      {children}
    </Text>
  )
}

// Two columns like the main page: club settings and the book list on the left, the chosen
// book's setup on the right. The book comes from ?book=ID. On small screens one column shows
// at a time: the left until a book is explicitly chosen, then that book's setup.
export default async function AdminPage({ searchParams }: { searchParams: { book?: string | string[] } }) {
  await requireAdmin()
  const [books, clubName] = await Promise.all([listBooks(), getClubName()])
  const requested = typeof searchParams.book === 'string' ? searchParams.book : undefined
  const { book, explicit } = pickAdminBook(books, requested)
  const fullHeight = `calc(100dvh - ${NAV_HEIGHT_PX}px)`

  return (
    <Grid templateColumns={{ base: '1fr', lg: '1fr 2fr' }} h={{ lg: fullHeight }} minH={{ base: fullHeight }}>
      <Box
        as="aside"
        aria-label="Admin"
        display={{ base: explicit ? 'none' : 'block', lg: 'block' }}
        overflowY={{ lg: 'auto' }}
        minH={0}
      >
        <VStack align="stretch" spacing={8} p={{ base: 6, md: 8 }}>
          <Box>
            <Heading as="h1" size="2xl">
              Club admin
            </Heading>
            <Text color="mist" mt={2}>
              Name your club, add books and shape the conversations.
            </Text>
          </Box>

          <Box {...CARD_PROPS}>
            <Text {...LABEL_PROPS} color="dustyRose" mb={3}>
              Club name
            </Text>
            <AdminForm
              action={updateClubNameAction}
              rule={{ kind: 'clubName' }}
              mode="edit"
              submitLabel="Save"
              submitVariant="goldOutline"
              showSaved
            >
              <Input
                name="clubName"
                defaultValue={clubName ?? ''}
                placeholder="e.g. The Thursday Readers"
                aria-label="Club name"
                borderRadius="full"
              />
            </AdminForm>
            <Text fontSize="sm" color="mist" mt={3}>
              Shown in the top bar for every member.
            </Text>
          </Box>

          <Box {...CARD_PROPS}>
            <Heading as="h2" size="lg" mb={4}>
              Add a new book
            </Heading>
            {/* Keyed by the selected book: adding a book redirects to it, which clears this form. */}
            <AdminForm
              key={book?.id ?? 'none'}
              action={createBookAction}
              rule={{ kind: 'newBook' }}
              mode="create"
              submitLabel="Add book"
              submitIcon={<FontAwesomeIcon icon={faPlus} />}
              submitVariant="solid"
              layout="custom"
            >
              <VStack align="stretch" spacing={4}>
                <Box as="label" display="block">
                  <FieldLabel>Title</FieldLabel>
                  <Input name="title" placeholder="e.g. Rebecca" required />
                </Box>
                <Box as="label" display="block">
                  <FieldLabel>Author</FieldLabel>
                  <Input name="author" placeholder="e.g. Daphne du Maurier" required />
                </Box>
                <Flex gap={3} align="flex-end" wrap="wrap">
                  <Box as="label" display="block" flex="1" minW="100px">
                    <FieldLabel>Number of chapters</FieldLabel>
                    <Input name="totalChapters" type="number" min={1} required />
                  </Box>
                  <AdminFormActions />
                </Flex>
              </VStack>
            </AdminForm>
          </Box>

          <AdminBookList books={books} selectedId={book?.id ?? null} />
        </VStack>
      </Box>

      <Box
        as="main"
        display={{ base: explicit ? 'block' : 'none', lg: 'block' }}
        bg="panel"
        borderLeftWidth={{ lg: '1px' }}
        borderColor="divider"
        overflowY={{ lg: 'auto' }}
        minH={0}
      >
        <Link
          as={NextLink}
          href="/admin"
          display={{ base: 'inline-flex', lg: 'none' }}
          alignItems="center"
          gap={2}
          px={6}
          pt={6}
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          Back to books
        </Link>
        {book ? (
          <BookSetup book={book} />
        ) : (
          <Flex h="100%" minH="50vh" align="center" justify="center" p={8}>
            <Heading as="h2" size="lg" fontStyle="italic" color="mist" textAlign="center">
              Add a book to start setting it up.
            </Heading>
          </Flex>
        )}
      </Box>
    </Grid>
  )
}
```

- [ ] **Step 4: Type check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 5: Check in the browser**

Run `npm run dev` and sign in as the admin. Check:
- At 1280px wide, two columns, and each scrolls on its own.
- Club name: edit it and Save. "Saved" appears. Typing again hides it.
- Add a book. The page goes to `/admin?book=<id>`, the new book is selected (gold border), and the form is empty.
- Clicking another book's title selects it.
- Mark as past and Mark as current toggle the badge.
- Delete book. Deleting the selected book falls back to the default book.
- `/admin?book=nonsense` shows the default book.
- At 400px wide, `/admin` shows only the left column. Choosing a book shows its setup with "Back to books".

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/page.tsx src/components/AdminBookList.tsx src/components/BookSetup.tsx
git commit -m "feat: two-column admin page with club name, add book and book list"
```

---

### Task 5: Book setup header and completion chips

**Files:**
- Create: `src/components/CompletionChips.tsx`
- Create: `src/components/BookSetupHeader.tsx`
- Modify: `src/components/BookSetup.tsx`

**Interfaces:**
- Consumes: `chapterCoverage` (Task 1), `AdminForm` (Task 3), `updateTotalChaptersAction`.
- Produces:
  - `type Completion = { description: boolean; cover: boolean; sections: boolean }`
  - `CompletionChips({ completion: Completion })` (no hooks; usable from server or client)
  - `BookSetupHeader({ bookId: string; title: string; author: string; totalChapters: number; minTotal: number; completion: Completion })` (client)

- [ ] **Step 1: Create the chips**

Create `src/components/CompletionChips.tsx`:

```tsx
import { Box, Flex, Link, Text } from '@chakra-ui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck } from '@fortawesome/free-solid-svg-icons'

export type Completion = { description: boolean; cover: boolean; sections: boolean }

const CHIPS = [
  { key: 'description', label: 'Description', done: 'done', notDone: 'not set' },
  { key: 'cover', label: 'Cover', done: 'done', notDone: 'not set' },
  { key: 'sections', label: 'Sections', done: 'every chapter covered', notDone: 'not all chapters covered' },
] as const

// What's filled in for this book. Each chip jumps to the card that fills it in.
export function CompletionChips({ completion }: { completion: Completion }) {
  return (
    <Flex as="ul" listStyleType="none" gap={3} wrap="wrap" m={0} p={0} aria-label="Setup checklist">
      {CHIPS.map((chip) => {
        const done = completion[chip.key]
        return (
          <Box as="li" key={chip.key}>
            <Link
              href={`#${chip.key}`}
              aria-label={`${chip.label}: ${done ? chip.done : chip.notDone}`}
              display="flex"
              alignItems="center"
              gap={2}
              px={4}
              py={1.5}
              borderRadius="full"
              borderWidth="1px"
              borderColor={done ? 'antiqueGold' : 'borderMuted'}
              bg={done ? 'mulberry' : 'transparent'}
              color={done ? 'parchment' : 'mist'}
              _hover={{ bg: 'bubbleMine', textDecoration: 'none' }}
              _focusVisible={{ outline: '2px solid', outlineColor: 'antiqueGold', outlineOffset: '2px' }}
            >
              {done ? (
                <Box as="span" aria-hidden color="antiqueGold" fontSize="sm">
                  <FontAwesomeIcon icon={faCheck} />
                </Box>
              ) : (
                <Box as="span" aria-hidden boxSize="10px" borderRadius="full" borderWidth="1.5px" borderColor="mist" />
              )}
              <Text as="span" color="inherit">
                {chip.label}
              </Text>
            </Link>
          </Box>
        )
      })}
    </Flex>
  )
}
```

- [ ] **Step 2: Create the header**

Create `src/components/BookSetupHeader.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Box, Button, Flex, Heading, Input, Text } from '@chakra-ui/react'
import { AdminForm } from '@/components/AdminForm'
import { CompletionChips, type Completion } from '@/components/CompletionChips'
import { LABEL_PROPS } from '@/components/adminStyles'
import { updateTotalChaptersAction } from '@/app/admin/actions'

const SUBTITLE_PROPS = { fontFamily: 'heading', fontStyle: 'italic', fontSize: 'xl', color: 'mist' } as const

// Title, "Author, N chapters" (the count edits in place), and the completion chips.
export function BookSetupHeader({
  bookId,
  title,
  author,
  totalChapters,
  minTotal,
  completion,
}: {
  bookId: string
  title: string
  author: string
  totalChapters: number
  minTotal: number
  completion: Completion
}) {
  const [editingTotal, setEditingTotal] = useState(false)
  const close = () => setEditingTotal(false)

  return (
    <Flex justify="space-between" align="flex-end" gap={4} wrap="wrap">
      <Box minW={0}>
        <Text {...LABEL_PROPS} color="dustyRose">
          Book setup
        </Text>
        <Heading as="h1" size="2xl" mt={1}>
          {title}
        </Heading>
        {editingTotal ? (
          <Box mt={2}>
            <AdminForm
              action={updateTotalChaptersAction}
              rule={{ kind: 'total', minTotal }}
              mode="edit"
              submitLabel="Save"
              hiddenFields={{ bookId }}
              onSuccess={close}
              onCancel={close}
            >
              <Text {...SUBTITLE_PROPS}>{author},</Text>
              <Input
                name="totalChapters"
                type="number"
                min={1}
                defaultValue={totalChapters}
                aria-label="Total chapters"
                size="sm"
                w="90px"
                required
                autoFocus
              />
              <Text {...SUBTITLE_PROPS}>chapters</Text>
            </AdminForm>
          </Box>
        ) : (
          <Flex align="baseline" gap={3} mt={1} wrap="wrap">
            <Text {...SUBTITLE_PROPS}>
              {author}, {totalChapters} chapters
            </Text>
            <Button size="sm" variant="link" aria-label="Edit total chapters" onClick={() => setEditingTotal(true)}>
              Edit
            </Button>
          </Flex>
        )}
      </Box>
      <CompletionChips completion={completion} />
    </Flex>
  )
}
```

- [ ] **Step 3: Use the header in BookSetup**

Replace `src/components/BookSetup.tsx` with:

```tsx
import { VStack } from '@chakra-ui/react'
import type { AdminBook } from '@/lib/books'
import { chapterCoverage } from '@/lib/chapters'
import { BookSetupHeader } from '@/components/BookSetupHeader'

// The right column of the admin page: everything to set up one book.
// Client parts are keyed by the book so switching books resets any open edit.
export function BookSetup({ book }: { book: AdminBook }) {
  const coverage = chapterCoverage(book.totalChapters, book.sections)
  const coverVersion = book.cover?.updatedAt.getTime() ?? null

  return (
    <VStack align="stretch" spacing={8} p={{ base: 6, md: 10 }}>
      <BookSetupHeader
        key={book.id}
        bookId={book.id}
        title={book.title}
        author={book.author}
        totalChapters={book.totalChapters}
        minTotal={Math.max(0, ...book.sections.map((s) => s.endChapter))}
        completion={{ description: Boolean(book.blurb), cover: coverVersion !== null, sections: coverage.complete }}
      />
    </VStack>
  )
}
```

- [ ] **Step 4: Type check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 5: Check in the browser**

On `/admin?book=<id>`:
- The chips match the book's state.
- Sections is checked only when every chapter is covered. Use a book whose sections cover only some chapters to confirm it shows unchecked.
- Edit beside the chapter count swaps in the number field. Cancel swaps back.
- A total below the last section's end shows the existing error and keeps Save disabled.
- Saving a valid total updates the subtitle and closes the editor.

- [ ] **Step 6: Commit**

```bash
git add src/components/CompletionChips.tsx src/components/BookSetupHeader.tsx src/components/BookSetup.tsx
git commit -m "feat: book setup header with completion chips and in-place chapter count"
```

---

### Task 6: Description and Cover card, upload on choose

**Files:**
- Modify: `src/components/CoverUpload.tsx` (full rewrite)
- Create: `src/components/DescriptionCoverCard.tsx`
- Modify: `src/components/BookSetup.tsx`

**Interfaces:**
- Consumes: `AdminForm` and `AdminFormActions`, `CoverImage`, `updateBlurbAction`, `uploadCoverAction`, `removeCoverAction`, `CARD_PROPS`.
- Produces:
  - `CoverUpload({ bookId: string; title: string; hasCover: boolean; uploadAction: (formData: FormData) => Promise<void>; removeAction: () => Promise<void> })`
  - `DescriptionCoverCard({ book: { id: string; title: string; author: string; blurb: string | null }; coverVersion: number | null })`

- [ ] **Step 1: Rewrite CoverUpload**

Replace `src/components/CoverUpload.tsx` with:

```tsx
'use client'

import { useRef, useState } from 'react'
import { Box, Button, Text } from '@chakra-ui/react'
import { COVER_ACCEPT, MAX_COVER_BYTES } from '@/lib/cover-limits'

// Choosing a file uploads it straight away. The size check runs first, so an oversized image
// never leaves the browser.
export function CoverUpload({
  bookId,
  title,
  hasCover,
  uploadAction,
  removeAction,
}: {
  bookId: string
  title: string
  hasCover: boolean
  uploadAction: (formData: FormData) => Promise<void>
  removeAction: () => Promise<void>
}) {
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function upload(file: File) {
    const formData = new FormData()
    formData.set('bookId', bookId)
    formData.set('cover', file)
    setUploading(true)
    try {
      await uploadAction(formData)
      setError(null)
    } catch {
      setError('That image could not be uploaded. Try a JPG, PNG or WebP within the size limit.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <Box mt={4}>
      <input
        ref={inputRef}
        type="file"
        accept={COVER_ACCEPT}
        hidden
        aria-label={`Cover image for ${title}`}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (!file) return
          if (file.size > MAX_COVER_BYTES) {
            setError(`That image is ${Math.round(file.size / 1024)} KB. The limit is ${MAX_COVER_BYTES / 1024} KB.`)
            e.target.value = ''
            return
          }
          void upload(file)
        }}
      />
      <Button
        variant="goldOutline"
        px={6}
        onClick={() => inputRef.current?.click()}
        isLoading={uploading}
        loadingText="Uploading"
      >
        {hasCover ? 'Replace cover image' : 'Choose cover image'}
      </Button>
      <Text fontSize="sm" color="mist" mt={3}>
        JPG, PNG or WebP, up to {MAX_COVER_BYTES / 1024} KB.
      </Text>
      {error && (
        <Text role="alert" fontSize="sm" color="danger" mt={1}>
          {error}
        </Text>
      )}
      {hasCover && (
        <form action={removeAction}>
          <Button type="submit" size="sm" variant="link" color="danger" mt={2}>
            Remove cover
          </Button>
        </form>
      )}
    </Box>
  )
}
```

- [ ] **Step 2: Create the card**

Create `src/components/DescriptionCoverCard.tsx`:

```tsx
import { Box, Grid, Heading, Text, Textarea } from '@chakra-ui/react'
import { AdminForm, AdminFormActions } from '@/components/AdminForm'
import { CoverImage } from '@/components/CoverImage'
import { CoverUpload } from '@/components/CoverUpload'
import { CARD_PROPS } from '@/components/adminStyles'
import { removeCoverAction, updateBlurbAction, uploadCoverAction } from '@/app/admin/actions'

export function DescriptionCoverCard({
  book,
  coverVersion,
}: {
  book: { id: string; title: string; author: string; blurb: string | null }
  coverVersion: number | null
}) {
  return (
    <Grid templateColumns={{ base: '1fr', md: '1fr 240px' }} gap={8} {...CARD_PROPS}>
      <Box as="section" id="description" aria-labelledby="description-heading" scrollMarginTop={6}>
        <Heading as="h2" id="description-heading" size="lg">
          Description
        </Heading>
        <Text color="mist" mt={2} mb={4}>
          Shown on the book page. Keep it spoiler-free.
        </Text>
        <AdminForm
          key={book.id}
          action={updateBlurbAction}
          rule={{ kind: 'blurb' }}
          mode="edit"
          submitLabel="Save description"
          submitVariant="solid"
          showSaved
          hiddenFields={{ bookId: book.id }}
          layout="custom"
        >
          <Textarea
            name="blurb"
            defaultValue={book.blurb ?? ''}
            placeholder="A few spoiler-free lines about the book"
            aria-label="Description"
            rows={7}
            borderRadius="xl"
          />
          <Box mt={4}>
            <AdminFormActions />
          </Box>
        </AdminForm>
      </Box>
      <Box as="section" id="cover" aria-labelledby="cover-heading" scrollMarginTop={6}>
        <Heading as="h2" id="cover-heading" size="lg" mb={4}>
          Cover
        </Heading>
        <CoverImage book={book} coverVersion={coverVersion} width="200px" />
        {coverVersion === null && (
          <Text fontSize="sm" color="mist" mt={3}>
            No cover yet. This placeholder is shown instead.
          </Text>
        )}
        <CoverUpload
          bookId={book.id}
          title={book.title}
          hasCover={coverVersion !== null}
          uploadAction={uploadCoverAction}
          removeAction={async () => {
            'use server'
            await removeCoverAction(book.id)
          }}
        />
      </Box>
    </Grid>
  )
}
```

- [ ] **Step 3: Add the card to BookSetup**

In `src/components/BookSetup.tsx`, import `DescriptionCoverCard` from `@/components/DescriptionCoverCard` and add it after `<BookSetupHeader ... />`:

```tsx
      <DescriptionCoverCard book={book} coverVersion={coverVersion} />
```

- [ ] **Step 4: Type check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 5: Check in the browser**

- Edit the description and save. "Saved" shows, and the Description chip becomes checked. Clearing it and saving unchecks the chip.
- "Choose cover image" opens the picker, and choosing a small PNG uploads it straight away: the image replaces the placeholder, the Cover chip checks, and the button reads "Replace cover image".
- A file over 500 KB shows the size message and doesn't upload.
- Remove cover brings the placeholder back and unchecks the chip.
- Clicking the Description and Cover chips scrolls to their cards.

- [ ] **Step 6: Commit**

```bash
git add src/components/CoverUpload.tsx src/components/DescriptionCoverCard.tsx src/components/BookSetup.tsx
git commit -m "feat: description and cover card; covers upload as soon as one is chosen"
```

---

### Task 7: Discussion sections card with the coverage bar

**Files:**
- Create: `src/components/CoverageBar.tsx`
- Create: `src/components/SectionsCard.tsx`
- Modify: `src/components/BookSetup.tsx`

**Interfaces:**
- Consumes: `chapterCoverage`, `coverageSummary`, `chapterRangeName`, `sectionDisplayName`, `Coverage`, `FormRule` (all `@/lib/chapters`); `AdminForm` and `AdminFormActions`; `DeleteSectionButton`; `addSectionAction`, `updateSectionAction`, `deleteSectionAction`.
- Produces:
  - `CoverageBar({ coverage: Coverage; label: string })`
  - `type SectionRowData = { id: string; startChapter: number; endChapter: number; title: string | null; postCount: number }`
  - `SectionsCard({ bookId: string; totalChapters: number; sections: SectionRowData[] })` (client)

- [ ] **Step 1: Create the bar**

Create `src/components/CoverageBar.tsx`:

```tsx
import { Box, Flex } from '@chakra-ui/react'
import type { Coverage } from '@/lib/chapters'

// One segment per section and per gap, sized by chapter count: gold where a section covers it.
export function CoverageBar({ coverage, label }: { coverage: Coverage; label: string }) {
  return (
    <Flex role="img" aria-label={label} gap="4px" h="6px">
      {coverage.segments.map((s) => (
        <Box
          key={s.start}
          flex={s.end - s.start + 1}
          borderRadius="full"
          bg={s.covered ? 'antiqueGold' : 'progressTodo'}
        />
      ))}
    </Flex>
  )
}
```

- [ ] **Step 2: Create the sections card**

Create `src/components/SectionsCard.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Box, Button, Flex, Heading, HStack, Input, Text, VStack } from '@chakra-ui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus } from '@fortawesome/free-solid-svg-icons'
import { AdminForm, AdminFormActions } from '@/components/AdminForm'
import { CoverageBar } from '@/components/CoverageBar'
import { DeleteSectionButton } from '@/components/DeleteSectionButton'
import { CARD_PROPS, LABEL_PROPS } from '@/components/adminStyles'
import {
  chapterCoverage,
  chapterRangeName,
  coverageSummary,
  sectionDisplayName,
  type FormRule,
} from '@/lib/chapters'
import type { FormResult } from '@/app/admin/actions'
import { addSectionAction, deleteSectionAction, updateSectionAction } from '@/app/admin/actions'

export type SectionRowData = {
  id: string
  startChapter: number
  endChapter: number
  title: string | null
  postCount: number
}

const ROW_PROPS = { p: 5, bg: 'mulberry', borderWidth: '1px', borderColor: 'borderOpen', borderRadius: 'xl' } as const

function NumberField({ label, name, defaultValue }: { label: string; name: string; defaultValue?: number }) {
  return (
    <Box as="label" display="block" w="90px">
      <Text fontSize="sm" color="parchment" mb={1}>
        {label}
      </Text>
      <Input name={name} type="number" min={1} defaultValue={defaultValue} required />
    </Box>
  )
}

function SectionForm({
  action,
  mode,
  rule,
  hiddenFields,
  submitLabel,
  defaults,
  onDone,
}: {
  action: (formData: FormData) => Promise<FormResult>
  mode: 'edit' | 'create'
  rule: FormRule
  hiddenFields: Record<string, string>
  submitLabel: string
  defaults: { start?: number; end?: number; title: string }
  onDone: () => void
}) {
  return (
    <AdminForm
      action={action}
      rule={rule}
      mode={mode}
      submitLabel={submitLabel}
      submitVariant="solid"
      hiddenFields={hiddenFields}
      onSuccess={onDone}
      onCancel={onDone}
      layout="custom"
    >
      <Flex gap={3} align="flex-end" wrap="wrap">
        <NumberField label="From" name="startChapter" defaultValue={defaults.start} />
        <NumberField label="To" name="endChapter" defaultValue={defaults.end} />
        <Box as="label" display="block" flex="1" minW="160px">
          <Text fontSize="sm" color="parchment" mb={1}>
            Title (optional)
          </Text>
          <Input name="title" defaultValue={defaults.title} placeholder="e.g. Lowood" />
        </Box>
        <AdminFormActions />
      </Flex>
    </AdminForm>
  )
}

// Sections, the bar showing how much of the book they cover, and inline add and edit.
// One form is open at a time: a row being edited, or the new-section form ("new").
export function SectionsCard({
  bookId,
  totalChapters,
  sections,
}: {
  bookId: string
  totalChapters: number
  sections: SectionRowData[]
}) {
  const [editing, setEditing] = useState<string | null>(null)
  const close = () => setEditing(null)
  const coverage = chapterCoverage(totalChapters, sections)
  const summary = coverageSummary(coverage)
  const ranges = sections.map(({ id, startChapter, endChapter, title }) => ({ id, startChapter, endChapter, title }))

  return (
    <Box as="section" id="sections" aria-labelledby="sections-heading" scrollMarginTop={6} {...CARD_PROPS}>
      <Flex justify="space-between" align="flex-start" gap={4} wrap="wrap">
        <Box maxW="lg">
          <Heading as="h2" id="sections-heading" size="lg">
            Discussion sections
          </Heading>
          <Text color="mist" mt={2}>
            Each section becomes a conversation thread. Readers unlock it by finishing its last chapter. A name stays
            hidden until then.
          </Text>
        </Box>
        <Button
          leftIcon={<FontAwesomeIcon icon={faPlus} />}
          borderRadius="full"
          px={6}
          onClick={() => setEditing('new')}
          isDisabled={editing === 'new'}
        >
          Add section
        </Button>
      </Flex>

      <Box mt={6}>
        <CoverageBar coverage={coverage} label={`${summary.lead} ${summary.rest}`.trim()} />
        <Text mt={3} fontSize="sm">
          <Text as="strong" color="parchment" fontWeight={600}>
            {summary.lead}
          </Text>
          {summary.rest && ` ${summary.rest}`}
        </Text>
      </Box>

      <VStack as="ul" listStyleType="none" align="stretch" spacing={4} mt={6} mb={0} mx={0} p={0}>
        {editing === 'new' && (
          <Box as="li" {...ROW_PROPS} borderColor="antiqueGold">
            <Text {...LABEL_PROPS} color="antiqueGold" mb={3}>
              New section
            </Text>
            <SectionForm
              action={addSectionAction}
              mode="create"
              rule={{ kind: 'section', totalChapters, others: ranges }}
              hiddenFields={{ bookId }}
              submitLabel="Add section"
              defaults={{ start: coverage.gaps[0]?.start, title: '' }}
              onDone={close}
            />
          </Box>
        )}
        {sections.map((s) => {
          const range = chapterRangeName(s.startChapter, s.endChapter)
          if (editing === s.id) {
            return (
              <Box as="li" key={s.id} {...ROW_PROPS} borderColor="antiqueGold">
                <Text {...LABEL_PROPS} color="antiqueGold" mb={3}>
                  {range}
                </Text>
                <SectionForm
                  action={updateSectionAction}
                  mode="edit"
                  rule={{ kind: 'section', totalChapters, others: ranges, ignoreId: s.id }}
                  hiddenFields={{ sectionId: s.id }}
                  submitLabel="Save"
                  defaults={{ start: s.startChapter, end: s.endChapter, title: s.title ?? '' }}
                  onDone={close}
                />
              </Box>
            )
          }
          return (
            <Flex as="li" key={s.id} {...ROW_PROPS} justify="space-between" align="center" gap={4} wrap="wrap">
              <Box minW={0}>
                <Text {...LABEL_PROPS} color="antiqueGold">
                  {range}
                </Text>
                <Text fontFamily="heading" fontSize="2xl" fontWeight={600} color="parchment">
                  {s.title?.trim() || range}
                </Text>
              </Box>
              <HStack spacing={3} flexShrink={0}>
                <Button
                  size="sm"
                  variant="goldOutline"
                  aria-label={`Edit ${sectionDisplayName(s)}`}
                  onClick={() => setEditing(s.id)}
                >
                  Edit
                </Button>
                <DeleteSectionButton
                  label={sectionDisplayName(s)}
                  postCount={s.postCount}
                  action={() => deleteSectionAction(s.id)}
                />
              </HStack>
            </Flex>
          )
        })}
      </VStack>
    </Box>
  )
}
```

- [ ] **Step 3: Add the card to BookSetup**

In `src/components/BookSetup.tsx`, import `SectionsCard` from `@/components/SectionsCard` and add it after `<DescriptionCoverCard ... />`:

```tsx
      <SectionsCard
        key={book.id}
        bookId={book.id}
        totalChapters={book.totalChapters}
        sections={book.sections.map((s) => ({
          id: s.id,
          startChapter: s.startChapter,
          endChapter: s.endChapter,
          title: s.title,
          postCount: s._count.posts,
        }))}
      />
```

- [ ] **Step 4: Type check, lint and run the full suite**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: no errors; all tests PASS.

- [ ] **Step 5: Check in the browser**

Use a book with sections 1 to 5, 6 to 10 and 11 to 15 out of 38 chapters (`npm run db:mock-notes` may help, or add them by hand). Check:
- **Bar and summary:** three gold segments, one long dark segment, and "15 of 38 chapters are in a section. Not yet covered: chapters 16 to 38."
- **Add section:** opens a form with From = 16. Entering To = 38 and saving closes the form, the bar becomes all gold, the summary reads "All 38 chapters are in a section." and the Sections chip checks.
- **Add section when complete:** From is empty.
- **Overlap:** an overlapping range shows the overlap message and keeps Save disabled.
- **Edit:** opens one row's form. Opening another row's Edit closes the first. Cancel and Save both close it.
- **Delete:** a section with posts asks for confirmation.
- **Switching books:** with a form open, choosing another book closes it.
- **Narrow width:** at 400px wide, rows and forms wrap without horizontal scrolling.

- [ ] **Step 6: Commit**

```bash
git add src/components/CoverageBar.tsx src/components/SectionsCard.tsx src/components/BookSetup.tsx
git commit -m "feat: discussion sections card with chapter coverage bar and inline add and edit"
```

---

### Task 8: Allowed emails on the Members page

**Files:**
- Create: `src/components/AllowedEmailsPanel.tsx`
- Modify: `src/app/members/page.tsx`
- Modify: `src/app/admin/allowed-emails/page.tsx` (becomes a redirect)

**Interfaces:**
- Consumes: `listAllowedEmails` (`@/lib/allowlist`), `addAllowedEmailAction`, `removeAllowedEmailAction` (Task 2 made them revalidate `/members`), `CARD_PROPS`.
- Produces: `AllowedEmailsPanel({ emails: string[] })` (server component)

- [ ] **Step 1: Create the panel**

Create `src/components/AllowedEmailsPanel.tsx`:

```tsx
import { Box, Button, Flex, Heading, Input, Text, VStack } from '@chakra-ui/react'
import { CARD_PROPS } from '@/components/adminStyles'
import { addAllowedEmailAction, removeAllowedEmailAction } from '@/app/admin/actions'

// Admin only: who may sign in. The page only renders this, and only fetches emails, for admins.
export function AllowedEmailsPanel({ emails }: { emails: string[] }) {
  return (
    <Box as="section" aria-labelledby="allowed-heading" mt={12} maxW="2xl" {...CARD_PROPS}>
      <Heading as="h2" id="allowed-heading" size="lg">
        Allowed emails
      </Heading>
      <Text color="mist" mt={2}>
        Anyone on this list can sign in with Google.
      </Text>
      <form action={addAllowedEmailAction}>
        <Flex gap={3} mt={5} wrap="wrap">
          <Input
            name="email"
            type="email"
            placeholder="member@example.com"
            aria-label="Email to allow"
            required
            flex="1"
            minW="200px"
            borderRadius="full"
          />
          <Button type="submit" borderRadius="full" px={6}>
            Add
          </Button>
        </Flex>
      </form>
      {emails.length === 0 ? (
        <Text mt={5} color="mist" fontStyle="italic">
          No one has been added yet.
        </Text>
      ) : (
        <VStack as="ul" listStyleType="none" align="stretch" spacing={0} mt={5} mb={0} mx={0} p={0}>
          {emails.map((email) => (
            <Flex
              as="li"
              key={email}
              justify="space-between"
              align="center"
              gap={3}
              py={2}
              borderBottomWidth="1px"
              borderColor="divider"
            >
              <Text wordBreak="break-all">{email}</Text>
              <form
                action={async () => {
                  'use server'
                  await removeAllowedEmailAction(email)
                }}
              >
                <Button type="submit" size="sm" variant="link" color="danger" aria-label={`Remove ${email}`}>
                  Remove
                </Button>
              </form>
            </Flex>
          ))}
        </VStack>
      )}
    </Box>
  )
}
```

- [ ] **Step 2: Render it for admins on the Members page**

In `src/app/members/page.tsx`:
- Add imports: `import { listAllowedEmails } from '@/lib/allowlist'` and `import { AllowedEmailsPanel } from '@/components/AllowedEmailsPanel'`.
- Replace the first two lines of the function body with:

```tsx
  const user = await requireUser()
  // Emails are fetched only for admins, so members never receive them.
  const [members, allowedEmails] = await Promise.all([
    listMembers(),
    user.isAdmin ? listAllowedEmails() : Promise.resolve(null),
  ])
```

- After the closing `</SimpleGrid>`, add:

```tsx
      {allowedEmails && <AllowedEmailsPanel emails={allowedEmails} />}
```

- [ ] **Step 3: Redirect the old page**

Replace `src/app/admin/allowed-emails/page.tsx` with:

```tsx
import { redirect } from 'next/navigation'

// Allowed emails now live on the Members page, for admins.
export default function AllowedEmailsPage() {
  redirect('/members')
}
```

- [ ] **Step 4: Type check, lint and run the full suite**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: no errors; all tests PASS.

- [ ] **Step 5: Check in the browser**

**As the admin, on `/members`:**
- The panel shows below the members grid.
- Adding `Someone@Example.com` lists it as `someone@example.com`.
- Remove takes it off the list.
- `/admin/allowed-emails` lands on `/members`.

**As a non-admin member** (add their email first, then sign in as them in a private window):
- No panel shows.
- The page's HTML source contains no email addresses.

- [ ] **Step 6: Commit**

```bash
git add src/components/AllowedEmailsPanel.tsx src/app/members/page.tsx src/app/admin/allowed-emails/page.tsx
git commit -m "feat: admins manage allowed emails on the Members page"
```

---

### Task 9: Final verification

- [ ] **Step 1: Full checks**

Run: `npx tsc --noEmit && npm run lint && npm test && npm run build`
Expected: all succeed.

- [ ] **Step 2: Compare against the concept**

With `npm run dev`, open `/admin?book=<Jane Eyre id>` at about 1280 to 1600px wide and compare it with `admin.png`, `admin discussion sections.png` and `admin books.png`. Check:
- the column proportions
- the card styling
- the chip placement beside the subtitle
- the bar segments
- the row buttons

Then confirm the deliberate differences from the concept:
- The Sections chip is unchecked at 15 of 38.
- The cover help text says 500 KB.
- Past books show "Mark as current".
- There's an Edit link beside the chapter count.

- [ ] **Step 3: Keyboard pass**

Tab through the left column, then the right. Check that:
- The chips, Edit, Add section, row Edit/Delete and the form controls are all reachable.
- Focus outlines are visible.
- Opening Edit on the chapter count focuses the number field.
