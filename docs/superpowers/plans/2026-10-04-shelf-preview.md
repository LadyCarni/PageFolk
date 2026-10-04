# Our shelf preview panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/shelf` as a cover grid with a book preview panel, add an optional "Read in" month per book (set in admin), and give generated covers four rotating colors.

**Architecture:** A nullable `Book.readMonth` (`"YYYY-MM"`) is edited from the admin book setup header. The shelf route loads every past book's preview data on the server through `getShelf(userId)` and hands it to a client `ShelfBrowser`. That component owns the selected book, mirrors it to `?book=` with `history.replaceState`, and renders the grid plus a `ShelfPreview` panel on `lg` and wider. Below `lg`, covers are plain links to the existing `/shelf/[bookId]` page. Pure logic lives in small modules with unit tests. Components are checked with the type checker and by hand, because the project has no component-test setup.

**Tech Stack:** Next.js 14 (app router, server actions), React 18, Chakra UI 2, Prisma 5 on SQLite, Font Awesome (free-solid icons), Vitest.

**Spec:** `docs/superpowers/specs/2026-10-04-shelf-preview-design.md`

## Global Constraints

- Branch: `shelf-redesign`. Commit after every task, and end every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Test command: `npm test` (its `pretest` resets `test.db` with `prisma db push --force-reset`). One file: `npm test -- tests/lib/<file>.test.ts`. Type check: `npx tsc --noEmit`. Do **not** run `npm run lint` (it starts an interactive ESLint setup).
- Baseline before Task 1: 27 test files, 239 tests passing; `npx tsc --noEmit` clean.
- Schema changes are applied with `npx prisma db push` (dev DB) and `npx prisma generate`. The project does not use migration files.
- `readMonth` is stored as `"YYYY-MM"` or `null`. Valid years are 2000 to next year inclusive.
- Month names come from a hard-coded English array, never `toLocaleString`, so output does not depend on the server's timezone or locale.
- No new npm dependencies.
- Copy is exact (see the spec): "Our shelf", "A gold bookmark means you have read it", "Books you have finished have their conversations open to you. The rest stay sealed, so nothing gets spoiled.", "Open the full book", "Past conversations", "You have finished this book, so every thread is open.", "No conversations were set up for this book.", "No past books yet.", "You have read this", "Not started", "Read in: not set".
- Chakra's `lg` breakpoint is `62em`. The media query string used in code is `(min-width: 62em)`.
- Shelf tiles: `templateColumns="repeat(auto-fill, minmax(150px, 200px))"`, `justifyContent="start"`. Never `minChildWidth`.
- Every link in the preview goes to `/shelf/[bookId]`, or to `/shelf/[bookId]?thread=<sectionId>` for an unlocked section.

## Review Focus

1. **`?book=` naming a book that is not on the shelf** (the current book, a deleted one, garbage). Expected: the first shelf book is selected, with no crash. Pinned by `pickShelfBook` tests in Task 4.
2. **Progress above the chapter count** (an admin lowered the total after someone finished). Expected: `finished` is clamped to the total and the book counts as read. Pinned in `getShelf` tests in Task 4.
3. **Lowered progress with sections still open** (lowering never re-seals). Expected: `read` is false, but the open sections stay open and their notes count toward `openNotes`. Pinned in `getShelf` tests in Task 4.
4. **Only a month, or only a year, chosen in admin.** Expected: Save stays disabled with "Choose both a month and a year", and the server rejects it the same way if it is submitted anyway. Pinned in `readMonthFromParts` tests (Task 1) and action tests (Task 2).
5. **Two books with the same read month.** Expected: a stable order, newest added first. Pinned in `orderShelf` tests in Task 4.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `prisma/schema.prisma` (modify) | `Book.readMonth String?` |
| `src/lib/limits.ts` (modify) | `validateReadMonth` |
| `src/lib/read-month.ts` (create) | `MONTH_NAMES`, `formatReadMonth`, `splitReadMonth`, `readMonthFromParts`, `readMonthYears` (pure, client-safe) |
| `src/lib/books.ts` (modify) | `setReadMonth` |
| `src/lib/chapters.ts` (modify) | `FormRule` kind `readMonth` |
| `src/app/admin/actions.ts` (modify) | `updateReadMonthAction` |
| `src/components/AdminForm.tsx` (modify) | change detection and validation also cover `<select>` |
| `src/components/BookSetupHeader.tsx`, `src/components/BookSetup.tsx` (modify) | the "Read in" line and editor |
| `src/theme.ts` (modify) | `coverForest`, `coverNavy`, `coverPlum` tokens |
| `src/lib/cover-color.ts` (create) | `coverColor(bookId)` |
| `src/components/CoverImage.tsx` (modify) | uses `coverColor` |
| `src/lib/shelf-view.ts` (create) | `ShelfBook` type and pure shelf helpers (client-safe, no Prisma) |
| `src/lib/shelf.ts` (create) | `getShelf(userId)` (server, Prisma) |
| `src/components/ShelfBrowser.tsx` (create) | client: selection, URL mirror, two-pane layout, cover grid |
| `src/components/ShelfPreview.tsx` (create) | client: the preview panel |
| `src/app/shelf/page.tsx` (modify) | header, explainer card, empty state, renders `ShelfBrowser` |

---

### Task 1: The read month: schema, validation and formatting

**Files:**
- Modify: `prisma/schema.prisma` (model `Book`, lines 28-42)
- Modify: `src/lib/limits.ts`
- Create: `src/lib/read-month.ts`
- Modify: `src/lib/books.ts` (after `setBlurb`, around line 127)
- Test: `tests/lib/limits.test.ts`, `tests/lib/read-month.test.ts`, `tests/lib/books.test.ts`

**Interfaces:**
- Produces:
  - `validateReadMonth(input: string, now?: Date): string | null` (from `@/lib/limits`)
  - `MONTH_NAMES: readonly string[]` (12 English names)
  - `formatReadMonth(readMonth: string): string`, e.g. `"2026-09"` → `"September 2026"`
  - `splitReadMonth(readMonth: string | null): { month: string; year: string }`, e.g. `"2026-09"` → `{ month: '09', year: '2026' }`, and `null` → `{ month: '', year: '' }`
  - `readMonthFromParts(month: string, year: string, now?: Date): { readMonth: string } | { error: string }` (`''` means clear)
  - `readMonthYears(now?: Date): number[]` (next year down to 2000)
  - `setReadMonth(bookId: string, readMonth: string): Promise<Book>` (from `@/lib/books`; `''` stores `null`; throws `ValidationError` when invalid)

- [ ] **Step 1: Add the column**

In `prisma/schema.prisma`, inside `model Book`, after `blurb         String?`:

```prisma
  readMonth     String? // "YYYY-MM", the month the club read the book
```

Run: `npx prisma db push && npx prisma generate`
Expected: "Your database is now in sync with your Prisma schema" and "Generated Prisma Client".

- [ ] **Step 2: Write the failing tests**

Append to `tests/lib/limits.test.ts`, and add `validateReadMonth` to its import from `@/lib/limits`:

```ts
describe('validateReadMonth', () => {
  const now = new Date('2026-10-04T12:00:00Z')

  it('accepts empty (clear) and real months from 2000 to next year', () => {
    expect(validateReadMonth('', now)).toBeNull()
    expect(validateReadMonth('2000-01', now)).toBeNull()
    expect(validateReadMonth('2026-09', now)).toBeNull()
    expect(validateReadMonth('2027-12', now)).toBeNull()
  })

  it('rejects bad formats, impossible months and out-of-range years', () => {
    for (const bad of ['2026-9', '26-09', '2026/09', 'September 2026', '2026-00', '2026-13', '1999-12', '2028-01', ' 2026-09']) {
      expect(validateReadMonth(bad, now)).toBe('Choose a month and year between 2000 and 2027')
    }
  })
})
```

Create `tests/lib/read-month.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { MONTH_NAMES, formatReadMonth, readMonthFromParts, readMonthYears, splitReadMonth } from '@/lib/read-month'

const now = new Date('2026-10-04T12:00:00Z')

describe('formatReadMonth', () => {
  it('names every month without shifting it', () => {
    MONTH_NAMES.forEach((name, i) => {
      const mm = String(i + 1).padStart(2, '0')
      expect(formatReadMonth(`2026-${mm}`)).toBe(`${name} 2026`)
    })
    expect(formatReadMonth('2026-01')).toBe('January 2026')
    expect(formatReadMonth('2026-12')).toBe('December 2026')
  })
})

describe('splitReadMonth', () => {
  it('splits a stored month and treats null as empty', () => {
    expect(splitReadMonth('2026-09')).toEqual({ month: '09', year: '2026' })
    expect(splitReadMonth(null)).toEqual({ month: '', year: '' })
  })
})

describe('readMonthFromParts', () => {
  it('joins a month and year', () => {
    expect(readMonthFromParts('09', '2026', now)).toEqual({ readMonth: '2026-09' })
  })

  it('treats both empty as clear', () => {
    expect(readMonthFromParts('', '', now)).toEqual({ readMonth: '' })
  })

  it('needs both parts', () => {
    expect(readMonthFromParts('09', '', now)).toEqual({ error: 'Choose both a month and a year' })
    expect(readMonthFromParts('', '2026', now)).toEqual({ error: 'Choose both a month and a year' })
  })

  it('rejects values outside the allowed range', () => {
    expect(readMonthFromParts('13', '2026', now)).toEqual({ error: 'Choose a month and year between 2000 and 2027' })
    expect(readMonthFromParts('01', '1999', now)).toEqual({ error: 'Choose a month and year between 2000 and 2027' })
  })
})

describe('readMonthYears', () => {
  it('runs from next year down to 2000', () => {
    const years = readMonthYears(now)
    expect(years[0]).toBe(2027)
    expect(years[years.length - 1]).toBe(2000)
    expect(years).toHaveLength(28)
  })
})
```

In `tests/lib/books.test.ts`, add `setReadMonth` to its `@/lib/books` import (`ValidationError` is already imported). Add this test **inside** the existing `describe('books', ...)` block, so its `beforeEach` clears the tables first:

```ts
  it('setReadMonth 'stores a month, clears with empty, and rejects bad input without saving', async () => {
    const book = await prisma.book.create({ data: { title: 'Rebecca', author: 'Daphne du Maurier', totalChapters: 27 } })

    await setReadMonth(book.id, '2026-09')
    expect((await prisma.book.findUniqueOrThrow({ where: { id: book.id } })).readMonth).toBe('2026-09')

    await expect(setReadMonth(book.id, '2026-13')).rejects.toThrow(ValidationError)
    expect((await prisma.book.findUniqueOrThrow({ where: { id: book.id } })).readMonth).toBe('2026-09')

    await setReadMonth(book.id, '')
    expect((await prisma.book.findUniqueOrThrow({ where: { id: book.id } })).readMonth).toBeNull()
  })
```

- [ ] **Step 3: Run the tests and see them fail**

Run: `npm test -- tests/lib/limits.test.ts tests/lib/read-month.test.ts tests/lib/books.test.ts`
Expected: FAIL. `validateReadMonth` and `setReadMonth` are not exported, and `@/lib/read-month` cannot be resolved.

- [ ] **Step 4: Implement**

Append to `src/lib/limits.ts`:

```ts
export const READ_MONTH_MIN_YEAR = 2000

// "YYYY-MM" from 2000 to next year. Empty is valid: saving it clears the month.
export function validateReadMonth(input: string, now: Date = new Date()): string | null {
  if (input === '') return null
  const maxYear = now.getFullYear() + 1
  const message = `Choose a month and year between ${READ_MONTH_MIN_YEAR} and ${maxYear}`
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(input)
  if (!match) return message
  const year = Number(match[1])
  return year < READ_MONTH_MIN_YEAR || year > maxYear ? message : null
}
```

Create `src/lib/read-month.ts`:

```ts
import { READ_MONTH_MIN_YEAR, validateReadMonth } from '@/lib/limits'

// Hard-coded so the label never depends on the server's locale or timezone.
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const

// "2026-09" -> "September 2026"
export function formatReadMonth(readMonth: string): string {
  const [year, month] = readMonth.split('-')
  return `${MONTH_NAMES[Number(month) - 1]} ${year}`
}

export function splitReadMonth(readMonth: string | null): { month: string; year: string } {
  if (!readMonth) return { month: '', year: '' }
  const [year, month] = readMonth.split('-')
  return { month, year }
}

// The admin editor posts a month and a year separately. Both empty means clear.
export function readMonthFromParts(
  month: string,
  year: string,
  now: Date = new Date()
): { readMonth: string } | { error: string } {
  if (month === '' && year === '') return { readMonth: '' }
  if (month === '' || year === '') return { error: 'Choose both a month and a year' }
  const readMonth = `${year}-${month}`
  const problem = validateReadMonth(readMonth, now)
  return problem ? { error: problem } : { readMonth }
}

// Newest first, for the year dropdown.
export function readMonthYears(now: Date = new Date()): number[] {
  const years: number[] = []
  for (let year = now.getFullYear() + 1; year >= READ_MONTH_MIN_YEAR; year--) years.push(year)
  return years
}
```

In `src/lib/books.ts`, change the limits import to `import { validateBlurb, validateReadMonth } from '@/lib/limits'` and add after `setBlurb`:

```ts
export async function setReadMonth(bookId: string, readMonth: string) {
  const problem = validateReadMonth(readMonth)
  if (problem) throw new ValidationError(problem)
  return prisma.book.update({ where: { id: bookId }, data: { readMonth: readMonth === '' ? null : readMonth } })
}
```

- [ ] **Step 5: Run the tests and see them pass**

Run: `npm test -- tests/lib/limits.test.ts tests/lib/read-month.test.ts tests/lib/books.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma src/lib/limits.ts src/lib/read-month.ts src/lib/books.ts tests/lib/limits.test.ts tests/lib/read-month.test.ts tests/lib/books.test.ts
git commit -m "feat: optional read month on books, with validation and formatting

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Admin sets the read month

**Files:**
- Modify: `src/lib/chapters.ts:63-101` (`FormRule`, `validateFormValues`)
- Modify: `src/app/admin/actions.ts` (imports; new action after `updateBlurbAction`)
- Modify: `src/components/AdminForm.tsx` (`evaluate`, around lines 103-118)
- Modify: `src/components/BookSetupHeader.tsx`
- Modify: `src/components/BookSetup.tsx:16-24`
- Test: `tests/app/admin-actions.test.ts`, `tests/lib/chapters.test.ts`

**Interfaces:**
- Consumes: `readMonthFromParts`, `splitReadMonth`, `formatReadMonth`, `MONTH_NAMES`, `readMonthYears` (Task 1); `setReadMonth` (Task 1).
- Produces: `updateReadMonthAction(formData: FormData): Promise<FormResult>`, which reads `bookId`, `month` (`''` or `'01'`–`'12'`) and `year` (`''` or 4 digits). `FormRule` gains `{ kind: 'readMonth' }`. `BookSetupHeader` gains the prop `readMonth: string | null`.

- [ ] **Step 1: Write the failing tests**

In `tests/app/admin-actions.test.ts`, add `updateReadMonthAction` to the import from `@/app/admin/actions`, then add inside `describe('admin actions', ...)`:

```ts
  it('rejects updateReadMonthAction for a non-admin', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Forbidden: admin only'))
    const fd = new FormData()
    fd.set('bookId', 'b1')
    fd.set('month', '09')
    fd.set('year', '2026')
    await expect(updateReadMonthAction(fd)).rejects.toThrow('Forbidden')
  })

  it('sets and clears the read month for an admin, and reports half-chosen or invalid months without saving', async () => {
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
    const book = await createBook({ title: 'Rebecca', author: 'Daphne du Maurier', totalChapters: 27 })
    const submit = (month: string, year: string) => {
      const fd = new FormData()
      fd.set('bookId', book.id)
      fd.set('month', month)
      fd.set('year', year)
      return updateReadMonthAction(fd)
    }
    const stored = async () => (await prisma.book.findUniqueOrThrow({ where: { id: book.id } })).readMonth

    expect(await submit('09', '2026')).toEqual({})
    expect(await stored()).toBe('2026-09')
    expect(revalidatePath).toHaveBeenCalledWith('/shelf')

    expect(await submit('09', '')).toEqual({ error: 'Choose both a month and a year' })
    expect(await submit('13', '2026')).toEqual({ error: expect.stringMatching(/^Choose a month and year between 2000 and \d{4}$/) })
    expect(await stored()).toBe('2026-09')

    expect(await submit('', '')).toEqual({})
    expect(await stored()).toBeNull()
  })

  it('requires a bookId to set the read month', async () => {
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
    const fd = new FormData()
    fd.set('month', '09')
    fd.set('year', '2026')
    await expect(updateReadMonthAction(fd)).rejects.toThrow('bookId is required')
  })
```

Append to `tests/lib/chapters.test.ts`, adding `validateFormValues` to its import from `@/lib/chapters` if it isn't there already:

```ts
describe('validateFormValues readMonth', () => {
  it('allows a full month, or clearing, and rejects half a choice', () => {
    expect(validateFormValues({ kind: 'readMonth' }, { month: '09', year: '2026' })).toBeNull()
    expect(validateFormValues({ kind: 'readMonth' }, { month: '', year: '' })).toBeNull()
    expect(validateFormValues({ kind: 'readMonth' }, { month: '09', year: '' })).toBe('Choose both a month and a year')
  })
})
```

- [ ] **Step 2: Run the tests and see them fail**

Run: `npm test -- tests/app/admin-actions.test.ts tests/lib/chapters.test.ts`
Expected: FAIL. `updateReadMonthAction` is not exported, and `'readMonth'` is not a `FormRule` kind (the readMonth form test falls through to the "Title and author are required" branch).

- [ ] **Step 3: Implement the rule and the action**

In `src/lib/chapters.ts`, add `| { kind: 'readMonth' }` to `FormRule`, add `import { readMonthFromParts } from '@/lib/read-month'` at the top, and add before the final title/author check in `validateFormValues`:

```ts
  if (rule.kind === 'readMonth') {
    const parsed = readMonthFromParts(values.month ?? '', values.year ?? '')
    return 'error' in parsed ? parsed.error : null
  }
```

In `src/app/admin/actions.ts`, add `setReadMonth` to the `@/lib/books` import and `import { readMonthFromParts } from '@/lib/read-month'`. Add after `updateBlurbAction`:

```ts
export async function updateReadMonthAction(formData: FormData): Promise<FormResult> {
  await requireAdmin()
  const bookId = String(formData.get('bookId') ?? '')
  if (!bookId) {
    throw new Error('bookId is required')
  }
  const parsed = readMonthFromParts(String(formData.get('month') ?? ''), String(formData.get('year') ?? ''))
  if ('error' in parsed) return { error: parsed.error }
  return reportingValidation(async () => {
    await setReadMonth(bookId, parsed.readMonth)
    revalidateBookPages()
  })
}
```

- [ ] **Step 4: Run the tests and see them pass**

Run: `npm test -- tests/app/admin-actions.test.ts tests/lib/chapters.test.ts`
Expected: PASS.

- [ ] **Step 5: Teach AdminForm about selects**

`AdminForm`'s `evaluate` only reads inputs and textareas, so changing a `<select>` would never enable Save. In `src/components/AdminForm.tsx`, inside the `for` loop in `evaluate`, after the existing `if (...) { ... }` block, add:

```ts
      if (element instanceof HTMLSelectElement && element.name) {
        values[element.name] = element.value
        // React marks the option from defaultValue as defaultSelected, so reset() and this agree.
        const initial = Array.from(element.options).find((option) => option.defaultSelected) ?? element.options[0]
        if (element.value !== (initial?.value ?? '')) differs = true
      }
```

- [ ] **Step 6: Add the "Read in" line to the setup header**

Replace `src/components/BookSetupHeader.tsx` with:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { Box, Button, Flex, Heading, Input, Select, Text } from '@chakra-ui/react'
import { AdminForm } from '@/components/AdminForm'
import { CompletionChips, type Completion } from '@/components/CompletionChips'
import { LABEL_PROPS, FIELD_PROPS } from '@/components/adminStyles'
import { updateReadMonthAction, updateTotalChaptersAction } from '@/app/admin/actions'
import { MONTH_NAMES, formatReadMonth, readMonthYears, splitReadMonth } from '@/lib/read-month'

const SUBTITLE_PROPS = { fontFamily: 'heading', fontStyle: 'italic', fontSize: 'xl', color: 'mist' } as const

// Title, "Author, N chapters" and "Read in Month Year" (both edit in place), and the completion chips.
export function BookSetupHeader({
  bookId,
  title,
  author,
  totalChapters,
  minTotal,
  readMonth,
  completion,
}: {
  bookId: string
  title: string
  author: string
  totalChapters: number
  minTotal: number
  readMonth: string | null
  completion: Completion
}) {
  const [editingTotal, setEditingTotal] = useState(false)
  const [editingMonth, setEditingMonth] = useState(false)
  const [clearing, startClearing] = useTransition()
  const close = () => setEditingTotal(false)
  const closeMonth = () => setEditingMonth(false)
  const parts = splitReadMonth(readMonth)

  function clearMonth() {
    startClearing(async () => {
      const formData = new FormData()
      formData.set('bookId', bookId)
      formData.set('month', '')
      formData.set('year', '')
      await updateReadMonthAction(formData)
    })
  }

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
              <Input {...FIELD_PROPS}
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
        {editingMonth ? (
          <Box mt={2}>
            <AdminForm
              action={updateReadMonthAction}
              rule={{ kind: 'readMonth' }}
              mode="edit"
              submitLabel="Save"
              hiddenFields={{ bookId }}
              onSuccess={closeMonth}
              onCancel={closeMonth}
            >
              <Text {...SUBTITLE_PROPS}>Read in</Text>
              <Select {...FIELD_PROPS} name="month" aria-label="Month read" size="sm" w="150px" defaultValue={parts.month} autoFocus>
                <option value="">Month</option>
                {MONTH_NAMES.map((name, i) => (
                  <option key={name} value={String(i + 1).padStart(2, '0')}>
                    {name}
                  </option>
                ))}
              </Select>
              <Select {...FIELD_PROPS} name="year" aria-label="Year read" size="sm" w="100px" defaultValue={parts.year}>
                <option value="">Year</option>
                {readMonthYears().map((year) => (
                  <option key={year} value={String(year)}>
                    {year}
                  </option>
                ))}
              </Select>
            </AdminForm>
          </Box>
        ) : (
          <Flex align="baseline" gap={3} mt={1} wrap="wrap">
            <Text {...SUBTITLE_PROPS}>{readMonth ? `Read in ${formatReadMonth(readMonth)}` : 'Read in: not set'}</Text>
            <Button
              size="sm"
              variant="link"
              aria-label={readMonth ? 'Edit month read' : 'Set month read'}
              onClick={() => setEditingMonth(true)}
            >
              {readMonth ? 'Edit' : 'Set'}
            </Button>
            {readMonth && (
              <Button size="sm" variant="link" color="mist" aria-label="Clear month read" isDisabled={clearing} onClick={clearMonth}>
                Clear
              </Button>
            )}
          </Flex>
        )}
      </Box>
      <CompletionChips completion={completion} />
    </Flex>
  )
}
```

In `src/components/BookSetup.tsx`, add `readMonth={book.readMonth}` to the `<BookSetupHeader ... />` props (after `minTotal`).

- [ ] **Step 7: Type check and run all tests**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors; all tests pass (239 plus the new ones).

- [ ] **Step 8: Check by hand**

Run `npm run dev` and open `http://localhost:3002/admin`. Choose a book and confirm:
- It shows "Read in: not set · Set".
- Set → choosing only a month keeps Save disabled and shows "Choose both a month and a year".
- Choosing both enables Save. Saving shows "Read in September 2026 · Edit · Clear".
- Clear returns it to "not set".
- Cancel closes the editor without saving.

- [ ] **Step 9: Commit**

```bash
git add src/lib/chapters.ts src/app/admin/actions.ts src/components/AdminForm.tsx src/components/BookSetupHeader.tsx src/components/BookSetup.tsx tests/app/admin-actions.test.ts tests/lib/chapters.test.ts
git commit -m "feat: admins set the month a book was read from book setup

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Generated covers rotate four colors

**Files:**
- Modify: `src/theme.ts` (colors, after `claret`)
- Create: `src/lib/cover-color.ts`
- Modify: `src/components/CoverImage.tsx` (the generated cover's `bg="claret"`)
- Test: `tests/lib/cover-color.test.ts`

**Interfaces:**
- Produces: `COVER_COLORS` (`readonly ['coverForest', 'coverNavy', 'coverPlum', 'claret']`) and `coverColor(bookId: string): (typeof COVER_COLORS)[number]`.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/cover-color.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { COVER_COLORS, coverColor } from '@/lib/cover-color'

describe('coverColor', () => {
  it('always gives the same book the same color', () => {
    expect(coverColor('clx9abc123')).toBe(coverColor('clx9abc123'))
  })

  it('uses every color across a set of books', () => {
    const used = new Set(Array.from({ length: 40 }, (_, i) => coverColor(`book-${i}`)))
    expect([...used].sort()).toEqual([...COVER_COLORS].sort())
  })
})
```

- [ ] **Step 2: Run the test and see it fail**

Run: `npm test -- tests/lib/cover-color.test.ts`
Expected: FAIL. `@/lib/cover-color` cannot be resolved.

- [ ] **Step 3: Implement**

Create `src/lib/cover-color.ts`:

```ts
// Theme tokens for generated covers. A book keeps its color everywhere because it comes from the ID.
export const COVER_COLORS = ['coverForest', 'coverNavy', 'coverPlum', 'claret'] as const

export function coverColor(bookId: string): (typeof COVER_COLORS)[number] {
  let hash = 0
  for (const char of bookId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return COVER_COLORS[hash % COVER_COLORS.length]
}
```

In `src/theme.ts`, change the `claret` line and add three tokens after it:

```ts
    claret: '#5b2236', // book cover
    coverForest: '#22382e', // generated book cover
    coverNavy: '#2a2342', // generated book cover
    coverPlum: '#3b1f2d', // generated book cover
```

In `src/components/CoverImage.tsx`, add `import { coverColor } from '@/lib/cover-color'`, change `bg="claret"` to `bg={coverColor(book.id)}`, and update the top comment to "otherwise a generated panel in one of four cover colors with a double gold frame."

- [ ] **Step 4: Run the test, type check**

Run: `npm test -- tests/lib/cover-color.test.ts && npx tsc --noEmit`
Expected: PASS, and no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cover-color.ts src/theme.ts src/components/CoverImage.tsx tests/lib/cover-color.test.ts
git commit -m "style: generated covers rotate forest, navy, plum and claret by book

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Shelf data

**Files:**
- Create: `src/lib/shelf-view.ts` (pure; must not import Prisma, because client components import it)
- Create: `src/lib/shelf.ts`
- Test: `tests/lib/shelf-view.test.ts`, `tests/lib/shelf.test.ts`

**Interfaces:**
- Consumes: `getSectionsForViewer(bookId, userId): Promise<SectionSummary[]>` and the type `SectionSummary` from `@/lib/sections`; `clampProgress(value, total)` from `@/lib/chapters`.
- Produces (in `@/lib/shelf-view`):
  ```ts
  export type ShelfBook = {
    id: string; title: string; author: string; blurb: string | null
    totalChapters: number; coverVersion: number | null; readMonth: string | null
    finished: number; read: boolean; sections: SectionSummary[]; openNotes: number
  }
  orderShelf<T extends { readMonth: string | null; createdAt: Date }>(books: T[]): T[]
  shelfSummary(total: number, read: number): string
  pickShelfBook(books: { id: string }[], requestedId: string | undefined): string | null
  statusLabel(book: Pick<ShelfBook, 'read' | 'finished' | 'totalChapters'>): string
  conversationsSubline(book: Pick<ShelfBook, 'read' | 'finished' | 'totalChapters'>): string
  sealedLabel(chaptersToGo: number): string
  plural(count: number, word: string): string   // "1 note", "3 notes"
  ```
- Produces (in `@/lib/shelf`): `getShelf(userId: string): Promise<ShelfBook[]>`.

- [ ] **Step 1: Write the failing pure tests**

Create `tests/lib/shelf-view.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { conversationsSubline, orderShelf, pickShelfBook, plural, sealedLabel, shelfSummary, statusLabel } from '@/lib/shelf-view'

const at = (iso: string) => new Date(iso)

describe('orderShelf', () => {
  it('puts dated books first, newest month first, then undated books by date added', () => {
    const books = [
      { id: 'undated-old', readMonth: null, createdAt: at('2026-01-01') },
      { id: 'jul', readMonth: '2026-07', createdAt: at('2026-07-01') },
      { id: 'undated-new', readMonth: null, createdAt: at('2026-05-01') },
      { id: 'sep', readMonth: '2026-09', createdAt: at('2026-02-01') },
      { id: 'dec-2025', readMonth: '2025-12', createdAt: at('2026-08-01') },
    ]
    expect(orderShelf(books).map((b) => b.id)).toEqual(['sep', 'jul', 'dec-2025', 'undated-new', 'undated-old'])
  })

  it('breaks a tie on the same month by date added, newest first, without changing the input', () => {
    const books = [
      { id: 'older', readMonth: '2026-09', createdAt: at('2026-01-01') },
      { id: 'newer', readMonth: '2026-09', createdAt: at('2026-03-01') },
    ]
    expect(orderShelf(books).map((b) => b.id)).toEqual(['newer', 'older'])
    expect(books.map((b) => b.id)).toEqual(['older', 'newer'])
  })
})

describe('shelfSummary', () => {
  it('counts books and what you have read', () => {
    expect(shelfSummary(8, 3)).toBe('8 books finished together. You have read 3 of them.')
    expect(shelfSummary(8, 1)).toBe('8 books finished together. You have read 1 of them.')
    expect(shelfSummary(8, 0)).toBe("8 books finished together. You haven't finished any yet.")
  })

  it('reads naturally with a single book', () => {
    expect(shelfSummary(1, 1)).toBe('1 book finished together. You have read it.')
    expect(shelfSummary(1, 0)).toBe("1 book finished together. You haven't finished it yet.")
  })
})

describe('pickShelfBook', () => {
  const books = [{ id: 'a' }, { id: 'b' }]

  it('picks the requested book when it is on the shelf', () => {
    expect(pickShelfBook(books, 'b')).toBe('b')
  })

  it('falls back to the first book for a missing or unknown request', () => {
    expect(pickShelfBook(books, undefined)).toBe('a')
    expect(pickShelfBook(books, 'current-book-id')).toBe('a')
  })

  it('picks nothing on an empty shelf', () => {
    expect(pickShelfBook([], 'a')).toBeNull()
  })
})

describe('statusLabel and conversationsSubline', () => {
  it('describes a finished book', () => {
    const book = { read: true, finished: 27, totalChapters: 27 }
    expect(statusLabel(book)).toBe('You have read this')
    expect(conversationsSubline(book)).toBe('You have finished this book, so every thread is open.')
  })

  it('describes a book in progress', () => {
    const book = { read: false, finished: 12, totalChapters: 27 }
    expect(statusLabel(book)).toBe('12 of 27 chapters read')
    expect(conversationsSubline(book)).toBe('You have read 12 of 27 chapters.')
  })

  it('describes a book not started', () => {
    const book = { read: false, finished: 0, totalChapters: 27 }
    expect(statusLabel(book)).toBe('Not started')
    expect(conversationsSubline(book)).toBe("You haven't started this book.")
  })
})

describe('sealedLabel and plural', () => {
  it('says how far until a sealed thread opens', () => {
    expect(sealedLabel(6)).toBe('Sealed · 6 chapters to go')
    expect(sealedLabel(1)).toBe('Sealed · 1 chapter to go')
    expect(sealedLabel(0)).toBe('Sealed')
  })

  it('pluralises counts', () => {
    expect(plural(1, 'note')).toBe('1 note')
    expect(plural(0, 'note')).toBe('0 notes')
    expect(plural(37, 'note')).toBe('37 notes')
  })
})
```

- [ ] **Step 2: Write the failing database test**

Create `tests/lib/shelf.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { getShelf } from '@/lib/shelf'
import { getSectionsForViewer } from '@/lib/sections'

async function makeBook(title: string, status: 'current' | 'past', extra: { readMonth?: string; totalChapters?: number } = {}) {
  return prisma.book.create({
    data: {
      title,
      author: 'Author',
      status,
      totalChapters: extra.totalChapters ?? 10,
      readMonth: extra.readMonth ?? null,
      sections: {
        create: [
          { startChapter: 1, endChapter: 5, order: 1 },
          { startChapter: 6, endChapter: 10, order: 2 },
        ],
      },
    },
    include: { sections: { orderBy: { order: 'asc' } } },
  })
}

async function post(sectionId: string, userId: string, count: number) {
  for (let i = 0; i < count; i++) {
    await prisma.post.create({ data: { sectionId, userId, body: `note ${i}` } })
  }
}

describe('getShelf', () => {
  beforeEach(async () => {
    await prisma.readingProgress.deleteMany()
    await prisma.post.deleteMany()
    await prisma.threadMembership.deleteMany()
    await prisma.bookCover.deleteMany()
    await prisma.section.deleteMany()
    await prisma.book.deleteMany()
    await prisma.user.deleteMany()
  })

  it('returns only past books, dated ones first', async () => {
    const user = await prisma.user.create({ data: { googleId: 'g-s1', email: 's1@example.com', name: 'Reader' } })
    await makeBook('Current', 'current')
    await makeBook('Undated', 'past')
    await makeBook('September', 'past', { readMonth: '2026-09' })

    const shelf = await getShelf(user.id)

    expect(shelf.map((b) => b.title)).toEqual(['September', 'Undated'])
    expect(shelf[0]).toMatchObject({ readMonth: '2026-09', coverVersion: null, totalChapters: 10, blurb: null })
  })

  it('marks a book read only when every chapter is finished, and clamps progress past the total', async () => {
    const user = await prisma.user.create({ data: { googleId: 'g-s2', email: 's2@example.com', name: 'Reader' } })
    const partial = await makeBook('Partial', 'past', { readMonth: '2026-09' })
    const over = await makeBook('Over', 'past', { readMonth: '2026-08' })
    await prisma.readingProgress.create({ data: { userId: user.id, bookId: partial.id, chaptersFinished: 9 } })
    await prisma.readingProgress.create({ data: { userId: user.id, bookId: over.id, chaptersFinished: 40 } })

    const [p, o] = await getShelf(user.id)

    expect(p).toMatchObject({ title: 'Partial', finished: 9, read: false })
    expect(o).toMatchObject({ title: 'Over', finished: 10, read: true })
  })

  it('shows sections exactly as the book page does, and counts notes only in open ones', async () => {
    const user = await prisma.user.create({ data: { googleId: 'g-s3', email: 's3@example.com', name: 'Reader' } })
    const book = await makeBook('Book', 'past')
    const [first, second] = book.sections
    await prisma.readingProgress.create({ data: { userId: user.id, bookId: book.id, chaptersFinished: 5 } })
    await prisma.threadMembership.create({ data: { userId: user.id, sectionId: first.id } })
    await post(first.id, user.id, 3)
    await post(second.id, user.id, 4)

    const [entry] = await getShelf(user.id)

    expect(entry.sections).toEqual(await getSectionsForViewer(book.id, user.id))
    expect(entry.sections.map((s) => s.status)).toEqual(['unlocked', 'locked'])
    expect(entry.openNotes).toBe(3)
  })

  it('keeps sections open after progress is lowered, without calling the book read', async () => {
    const user = await prisma.user.create({ data: { googleId: 'g-s4', email: 's4@example.com', name: 'Reader' } })
    const book = await makeBook('Lowered', 'past')
    for (const section of book.sections) {
      await prisma.threadMembership.create({ data: { userId: user.id, sectionId: section.id } })
      await post(section.id, user.id, 2)
    }
    await prisma.readingProgress.create({ data: { userId: user.id, bookId: book.id, chaptersFinished: 3 } })

    const [entry] = await getShelf(user.id)

    expect(entry.read).toBe(false)
    expect(entry.sections.every((s) => s.status === 'unlocked')).toBe(true)
    expect(entry.openNotes).toBe(4)
  })
})
```

- [ ] **Step 3: Run the tests and see them fail**

Run: `npm test -- tests/lib/shelf-view.test.ts tests/lib/shelf.test.ts`
Expected: FAIL. Neither module can be resolved.

- [ ] **Step 4: Implement the pure helpers**

Create `src/lib/shelf-view.ts`:

```ts
import type { SectionSummary } from '@/lib/sections'

// One past book as the shelf and its preview show it. Kept free of Prisma so client components can import it.
export type ShelfBook = {
  id: string
  title: string
  author: string
  blurb: string | null
  totalChapters: number
  coverVersion: number | null
  readMonth: string | null
  finished: number
  read: boolean
  sections: SectionSummary[]
  openNotes: number
}

type Progress = Pick<ShelfBook, 'read' | 'finished' | 'totalChapters'>

export function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

// Books with a read month first, newest month first; then the rest, newest added first.
export function orderShelf<T extends { readMonth: string | null; createdAt: Date }>(books: T[]): T[] {
  return [...books].sort((a, b) => {
    if (a.readMonth && b.readMonth && a.readMonth !== b.readMonth) return a.readMonth < b.readMonth ? 1 : -1
    if (a.readMonth && !b.readMonth) return -1
    if (!a.readMonth && b.readMonth) return 1
    return b.createdAt.getTime() - a.createdAt.getTime()
  })
}

export function shelfSummary(total: number, read: number): string {
  const books = `${plural(total, 'book')} finished together.`
  if (total === 1) return `${books} ${read ? 'You have read it.' : "You haven't finished it yet."}`
  return `${books} ${read ? `You have read ${read} of them.` : "You haven't finished any yet."}`
}

// The book to preview: the requested one when it is on the shelf, otherwise the first.
export function pickShelfBook(books: { id: string }[], requestedId: string | undefined): string | null {
  return books.find((book) => book.id === requestedId)?.id ?? books[0]?.id ?? null
}

export function statusLabel({ read, finished, totalChapters }: Progress): string {
  if (read) return 'You have read this'
  return finished > 0 ? `${finished} of ${totalChapters} chapters read` : 'Not started'
}

export function conversationsSubline({ read, finished, totalChapters }: Progress): string {
  if (read) return 'You have finished this book, so every thread is open.'
  return finished > 0 ? `You have read ${finished} of ${totalChapters} chapters.` : "You haven't started this book."
}

export function sealedLabel(chaptersToGo: number): string {
  return chaptersToGo > 0 ? `Sealed · ${plural(chaptersToGo, 'chapter')} to go` : 'Sealed'
}
```

- [ ] **Step 5: Implement `getShelf`**

Create `src/lib/shelf.ts`:

```ts
import { prisma } from '@/lib/db'
import { clampProgress } from '@/lib/chapters'
import { getSectionsForViewer } from '@/lib/sections'
import { orderShelf, type ShelfBook } from '@/lib/shelf-view'

// Every past book with what the shelf grid and preview need, already in shelf order.
export async function getShelf(userId: string): Promise<ShelfBook[]> {
  const books = await prisma.book.findMany({
    where: { status: 'past' },
    include: {
      // Only the timestamp, never the image bytes; it doubles as a cache-busting version.
      cover: { select: { updatedAt: true } },
      progress: { where: { userId }, select: { chaptersFinished: true } },
    },
  })

  return Promise.all(
    orderShelf(books).map(async (book): Promise<ShelfBook> => {
      const sections = await getSectionsForViewer(book.id, userId)
      const finished = clampProgress(book.progress[0]?.chaptersFinished ?? 0, book.totalChapters)
      return {
        id: book.id,
        title: book.title,
        author: book.author,
        blurb: book.blurb,
        totalChapters: book.totalChapters,
        coverVersion: book.cover?.updatedAt.getTime() ?? null,
        readMonth: book.readMonth,
        finished,
        read: finished === book.totalChapters,
        sections,
        openNotes: sections.reduce((sum, s) => (s.status === 'unlocked' ? sum + s.postCount : sum), 0),
      }
    })
  )
}
```

- [ ] **Step 6: Run the tests and see them pass**

Run: `npm test -- tests/lib/shelf-view.test.ts tests/lib/shelf.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/shelf-view.ts src/lib/shelf.ts tests/lib/shelf-view.test.ts tests/lib/shelf.test.ts
git commit -m "feat: shelf data with read state, open sections and shelf order

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Shelf page, cover grid and preview panel

The grid and the panel share the selection state, so they ship together. Task 4's tests cover the logic, so this task is checked with the type checker and by hand.

**Files:**
- Create: `src/components/ShelfPreview.tsx`
- Create: `src/components/ShelfBrowser.tsx`
- Modify: `src/app/shelf/page.tsx` (full replacement)

**Interfaces:**
- Consumes: `getShelf` (Task 4); `ShelfBook`, `pickShelfBook`, `shelfSummary`, `statusLabel`, `conversationsSubline`, `sealedLabel`, `plural` (Task 4); `formatReadMonth` (Task 1); `CoverImage`; `chapterRangeName(start, end)` from `@/lib/chapters`; `NAV_HEIGHT_PX` from `@/lib/layout`; `requireUser` from `@/lib/session`.
- Produces: `ShelfPreview({ book }: { book: ShelfBook })` and `ShelfBrowser({ books, requestedId, children }: { books: ShelfBook[]; requestedId: string | undefined; children: ReactNode })`.

- [ ] **Step 1: Write the preview panel**

Create `src/components/ShelfPreview.tsx`:

```tsx
'use client'

import NextLink from 'next/link'
import { Box, Button, Flex, Heading, HStack, Link, Text, VStack } from '@chakra-ui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRight, faChevronRight, faLock } from '@fortawesome/free-solid-svg-icons'
import { CoverImage } from '@/components/CoverImage'
import { chapterRangeName } from '@/lib/chapters'
import { formatReadMonth } from '@/lib/read-month'
import { conversationsSubline, plural, sealedLabel, statusLabel, type ShelfBook } from '@/lib/shelf-view'
import type { SectionSummary } from '@/lib/sections'

const LABEL_PROPS = { fontSize: 'xs', letterSpacing: '0.14em', textTransform: 'uppercase' } as const

// A preview of one past book. Everything in it leads to the full three-pane book page.
export function ShelfPreview({ book }: { book: ShelfBook }) {
  const href = `/shelf/${book.id}`

  return (
    <VStack align="stretch" spacing={7} p={10}>
      <Flex gap={6} align="flex-start">
        {/* The title link below is the accessible way in, so the cover link is skipped by keyboard and screen readers. */}
        <Link as={NextLink} href={href} flexShrink={0} tabIndex={-1} aria-hidden>
          <CoverImage book={book} coverVersion={book.coverVersion} width="150px" />
        </Link>
        <Box minW={0}>
          {book.readMonth && (
            <Text {...LABEL_PROPS} color="dustyRose">
              Read in {formatReadMonth(book.readMonth)}
            </Text>
          )}
          <Heading as="h2" size="xl" mt={1} aria-live="polite">
            <Link as={NextLink} href={href} color="parchment">
              {book.title}
            </Link>
          </Heading>
          <Text fontFamily="heading" fontStyle="italic" fontSize="lg" color="mist" mt={1}>
            {book.author}
          </Text>
          <Box
            as="span"
            display="inline-block"
            mt={3}
            px={3}
            py={1}
            borderRadius="full"
            borderWidth="1px"
            borderColor="dustyRose"
            bg="bubbleMine"
            color="parchment"
            fontSize="sm"
          >
            {statusLabel(book)}
          </Box>
        </Box>
      </Flex>

      <Button
        as={NextLink}
        href={href}
        variant="goldOutline"
        alignSelf="flex-start"
        px={6}
        rightIcon={<FontAwesomeIcon icon={faArrowRight} />}
      >
        Open the full book
      </Button>

      {book.blurb && <Text whiteSpace="pre-wrap">{book.blurb}</Text>}

      <HStack spacing={8} wrap="wrap">
        {[
          plural(book.totalChapters, 'chapter'),
          plural(book.sections.length, 'conversation'),
          plural(book.openNotes, 'note'),
        ].map((stat) => {
          const [count, ...rest] = stat.split(' ')
          return (
            <Text key={stat} color="mist">
              <Text as="span" fontFamily="heading" fontSize="3xl" color="antiqueGold" mr={2}>
                {count}
              </Text>
              {rest.join(' ')}
            </Text>
          )
        })}
      </HStack>

      <Box>
        <Heading as="h3" size="lg">
          Past conversations
        </Heading>
        <Text color="mist" mt={1}>
          {conversationsSubline(book)}
        </Text>
        {book.sections.length === 0 ? (
          <Text color="mist" mt={4}>
            No conversations were set up for this book.
          </Text>
        ) : (
          <VStack as="ul" align="stretch" spacing={3} mt={5} mb={0} mx={0} p={0} listStyleType="none">
            {book.sections.map((section) => (
              <PreviewRow key={section.id} section={section} href={href} />
            ))}
          </VStack>
        )}
      </Box>
    </VStack>
  )
}

function PreviewRow({ section, href }: { section: SectionSummary; href: string }) {
  const range = chapterRangeName(section.startChapter, section.endChapter)
  const locked = section.status === 'locked'
  const title = locked ? null : section.title?.trim() || null

  return (
    <Box as="li" listStyleType="none">
      <Link
        as={NextLink}
        href={locked ? href : `${href}?thread=${encodeURIComponent(section.id)}`}
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        gap={3}
        px={5}
        py={4}
        bg={locked ? 'sealed' : 'mulberry'}
        borderWidth="1px"
        borderStyle={locked ? 'dashed' : 'solid'}
        borderColor={locked ? 'borderMuted' : 'borderOpen'}
        borderRadius="xl"
        _hover={{ borderColor: 'antiqueGold', textDecoration: 'none' }}
      >
        <Box minW={0}>
          <Text {...LABEL_PROPS} color={locked ? 'mist' : 'antiqueGold'}>
            {title ?? range}
          </Text>
          <Text fontSize="sm" color="mist" mt={1}>
            {section.status === 'locked' ? sealedLabel(section.chaptersToGo) : plural(section.postCount, 'note')}
          </Text>
        </Box>
        <Box aria-hidden color={locked ? 'mist' : 'antiqueGold'} flexShrink={0}>
          <FontAwesomeIcon icon={locked ? faLock : faChevronRight} />
        </Box>
      </Link>
    </Box>
  )
}
```

- [ ] **Step 2: Write the browser (layout, grid, selection)**

Create `src/components/ShelfBrowser.tsx`:

```tsx
'use client'

import { useRef, useState, type MouseEvent, type ReactNode } from 'react'
import NextLink from 'next/link'
import { Box, Grid, Link, Text } from '@chakra-ui/react'
import { CoverImage } from '@/components/CoverImage'
import { ShelfPreview } from '@/components/ShelfPreview'
import { NAV_HEIGHT_PX } from '@/lib/layout'
import { formatReadMonth } from '@/lib/read-month'
import { pickShelfBook, type ShelfBook } from '@/lib/shelf-view'

// Chakra's lg breakpoint: the preview panel only exists at this width and up.
const WIDE_QUERY = '(min-width: 62em)'

// The shelf grid with a preview of the selected book. On wide screens a plain click on a cover
// previews it (a second click on the selected cover opens it); everywhere else covers are links.
export function ShelfBrowser({
  books,
  requestedId,
  children,
}: {
  books: ShelfBook[]
  requestedId: string | undefined
  children: ReactNode
}) {
  const [selectedId, setSelectedId] = useState(() => pickShelfBook(books, requestedId))
  const panelRef = useRef<HTMLDivElement>(null)
  const selected = books.find((book) => book.id === selectedId) ?? null
  const fullHeight = `calc(100dvh - ${NAV_HEIGHT_PX}px)`

  function onCoverClick(event: MouseEvent<HTMLAnchorElement>, id: string) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    if (!window.matchMedia(WIDE_QUERY).matches || id === selectedId) return
    event.preventDefault()
    setSelectedId(id)
    panelRef.current?.scrollTo({ top: 0 })
    // replaceState keeps the choice across a refresh without a history entry per click.
    window.history.replaceState(null, '', `/shelf?book=${encodeURIComponent(id)}`)
  }

  return (
    <Grid templateColumns={{ base: '1fr', lg: '3fr 2fr' }} h={{ lg: fullHeight }} minH={{ base: fullHeight }}>
      <Box as="main" overflowY={{ lg: 'auto' }} minH={0} p={{ base: 6, md: 10 }}>
        {children}
        <Grid
          as="ul"
          templateColumns="repeat(auto-fill, minmax(150px, 200px))"
          justifyContent="start"
          gap={8}
          mt={8}
          mb={0}
          mx={0}
          p={0}
          listStyleType="none"
        >
          {books.map((book) => {
            const month = book.readMonth ? formatReadMonth(book.readMonth) : null
            const isSelected = book.id === selectedId
            return (
              <li key={book.id}>
                <Link
                  as={NextLink}
                  href={`/shelf/${book.id}`}
                  onClick={(event: MouseEvent<HTMLAnchorElement>) => onCoverClick(event, book.id)}
                  aria-label={[`${book.title} by ${book.author}`, book.read && 'read', month].filter(Boolean).join(', ')}
                  aria-current={isSelected ? 'true' : undefined}
                  display="block"
                  _hover={{ textDecoration: 'none' }}
                >
                  <Box
                    position="relative"
                    borderRadius="md"
                    outline={isSelected ? { base: 'none', lg: '2px solid' } : 'none'}
                    outlineColor="antiqueGold"
                    outlineOffset="6px"
                    transition="transform 0.15s"
                    _hover={{ transform: 'translateY(-2px)' }}
                  >
                    <CoverImage book={book} coverVersion={book.coverVersion} width="100%" />
                    {book.read && (
                      <Box
                        aria-hidden
                        position="absolute"
                        top={0}
                        right="12%"
                        w="11%"
                        h="16%"
                        bg="antiqueGold"
                        clipPath="polygon(0 0, 100% 0, 100% 100%, 50% 75%, 0 100%)"
                      />
                    )}
                  </Box>
                  {month && (
                    <Text textAlign="center" color="mist" mt={3}>
                      {month}
                    </Text>
                  )}
                </Link>
              </li>
            )
          })}
        </Grid>
      </Box>
      <Box
        as="aside"
        aria-label="Book preview"
        ref={panelRef}
        display={{ base: 'none', lg: 'block' }}
        overflowY="auto"
        minH={0}
        bg="panel"
        borderLeftWidth="1px"
        borderColor="divider"
      >
        {selected && <ShelfPreview book={selected} />}
      </Box>
    </Grid>
  )
}
```

- [ ] **Step 3: Rewrite the page**

Replace `src/app/shelf/page.tsx` with:

```tsx
import { Box, Flex, Heading, Text } from '@chakra-ui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBookmark } from '@fortawesome/free-solid-svg-icons'
import { requireUser } from '@/lib/session'
import { getShelf } from '@/lib/shelf'
import { shelfSummary } from '@/lib/shelf-view'
import { ShelfBrowser } from '@/components/ShelfBrowser'

export default async function ShelfPage({ searchParams }: { searchParams: { book?: string | string[] } }) {
  const user = await requireUser()
  const books = await getShelf(user.id)
  const requestedId = typeof searchParams.book === 'string' ? searchParams.book : undefined

  if (books.length === 0) {
    return (
      <Box as="main" p={{ base: 6, md: 10 }}>
        <Heading as="h1" size="2xl">
          Our shelf
        </Heading>
        <Text mt={4} color="mist">
          No past books yet.
        </Text>
      </Box>
    )
  }

  return (
    <ShelfBrowser books={books} requestedId={requestedId}>
      <Heading as="h1" size="2xl">
        Our shelf
      </Heading>
      <Text mt={2} color="mist">
        {shelfSummary(books.length, books.filter((book) => book.read).length)}
      </Text>
      <Flex
        mt={6}
        gap={5}
        align="center"
        bg="velvet"
        borderWidth="1px"
        borderColor="border"
        borderRadius="2xl"
        px={6}
        py={5}
      >
        <Box aria-hidden color="antiqueGold" fontSize="3xl" flexShrink={0}>
          <FontAwesomeIcon icon={faBookmark} />
        </Box>
        <Box>
          <Heading as="h2" size="md">
            A gold bookmark means you have read it
          </Heading>
          <Text mt={1} fontSize="sm" color="mist">
            Books you have finished have their conversations open to you. The rest stay sealed, so nothing gets spoiled.
          </Text>
        </Box>
      </Flex>
    </ShelfBrowser>
  )
}
```

- [ ] **Step 4: Type check and run all tests**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors; all tests pass.

If `tsc` rejects `outline={{ base: 'none', lg: '2px solid' }}` or `as="ul"` on `Grid`, use `sx={{ '@media (min-width: 62em)': { outline: isSelected ? '2px solid' : 'none' } }}` for the outline, or wrap the list in `<Box as="ul">` around a `Grid` and keep the rest unchanged.

- [ ] **Step 5: Check by hand at desktop width**

Run `npm run dev`. Make sure at least three past books exist, give one or two of them a read month in admin, and finish every chapter of one. Then open `http://localhost:3002/shelf` in a window at least 1000px wide. Confirm:
- The header count matches. The explainer card shows.
- Dated books come first, with their month under the cover. The book you finished has the gold ribbon.
- With two or fewer books, covers stay at most 200px wide and sit at the left.
- The first book is selected (gold outline) and previewed on the right.
- Clicking another cover switches the preview instantly and the URL becomes `/shelf?book=<id>`. Refreshing keeps that book. The back button does not step through earlier selections.
- Clicking the selected cover opens `/shelf/<id>`. Cmd- or Ctrl-click opens it in a new tab.
- In the preview, the cover, title and "Open the full book" all go to `/shelf/<id>`. An open conversation row goes to `/shelf/<id>?thread=<sectionId>`, and a sealed row goes to `/shelf/<id>`.
- For an unfinished book: the pill shows "N of M chapters read", sealed rows show no note count, and the notes stat counts only open sections.

- [ ] **Step 6: Check by hand at phone width**

Resize to about 390px wide (or use device emulation). Confirm:
- One column with no preview panel and no gold outline.
- Tapping a cover goes straight to `/shelf/<id>`.
- There is no horizontal scrolling.

- [ ] **Step 7: Commit**

```bash
git add src/components/ShelfPreview.tsx src/components/ShelfBrowser.tsx src/app/shelf/page.tsx
git commit -m "feat: Our shelf shows a cover grid with a preview of the selected book

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Final verification and docs

**Files:**
- Modify: `README.md` (only if its production update steps don't already run `npx prisma db push`; they do, at line 45, so this is a check, not an edit)

- [ ] **Step 1: Full checks**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors; every test passes. Report the final count.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: the build succeeds and `/shelf` is listed as a dynamic route.

- [ ] **Step 3: Confirm the deploy steps cover the schema change**

Run: `grep -n "db push" README.md`
Expected: the production update section already runs `npx prisma db push` (line 45). No README change is needed. If that line has gone, add `npx prisma db push` to the production update steps, before the restart, and commit with `docs: production update applies schema changes`.

- [ ] **Step 4: Hand over for local testing**

Tell the user the branch is ready to try at `http://localhost:3002/shelf`, and list what to look at: the Task 5 manual checks plus the admin "Read in" editor. Do not merge or deploy until they approve.
