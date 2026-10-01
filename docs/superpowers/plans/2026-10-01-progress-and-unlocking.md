# Progress and Unlocking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the honor-system "Join thread" button with a per-reader chapter-progress stepper that unlocks threads once the reader finishes a thread's last chapter.

**Architecture:** Sections get a chapter range and optional title; books get `totalChapters`; a new `ReadingProgress` row stores each reader's number per book. A server action saves the number and creates a `ThreadMembership` (the existing "unlocked" record) for every section whose last chapter is reached. Memberships are never deleted, so threads stay open when the number is lowered. The server withholds sealed threads' titles and posts.

**Tech Stack:** Next.js 14 (app router, server actions), Prisma 5 + SQLite (`prisma db push`, no migrations folder), Chakra UI v2, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-01-progress-and-unlocking-design.md`

## Global Constraints

- `0 <= chaptersFinished <= totalChapters`; the server clamps (never throws for out-of-range numbers).
- Admin input: `1 <= startChapter <= endChapter <= totalChapters`; rejected otherwise.
- `ReadingProgress` is unique on `(userId, bookId)`.
- Never delete a `ThreadMembership` when progress is lowered or a section is edited.
- Prisma's SQLite driver has no `skipDuplicates`; unlocking is a loop of `upsert` calls in a transaction.
- Sealed-thread data sent to the page contains only its chapter range and chapters-to-go, never the title or posts. Opening a sealed thread by URL still returns 404.
- Display name is derived: `Chapters 6 to 10`, with the title alongside: `Chapters 6 to 10 · Lowood`.
- The project uses `prisma db push` (there is no `prisma/migrations`). `npm test` runs `pretest` (`db push --force-reset --skip-generate` on `test.db`), so run `npx prisma generate` yourself after any schema edit.
- New UI uses theme color tokens from `src/theme.ts` (`velvet`, `antiqueGold`, `progressCurrent`, `progressTodo`, `parchment`, `mist`, `dustyRose`, `border`, `mulberry`, `heading` font). **Prerequisite:** those tokens are currently uncommitted edits in `src/theme.ts` (together with font changes in `src/app/layout.tsx`, `NavBar.tsx`, `SectionActivity.tsx`, `UserAvatar.tsx`). Do not start Task 4 until they exist in the working tree.
- Stage files by explicit path. Never `git add -A` or `git add .`; `bookclub concept.png` in the repo root is untracked on purpose and must not be committed.

## Review Focus

Failure modes the spec implies but a straightforward implementation would miss, most likely first. Each has a test in the task that owns the code.

1. **Bad numeric input to the stepper or admin forms** (`NaN` from `Number('abc')`, `2.7`, `-3`, `99`): progress clamps to a whole number in `0..total` and never persists `NaN`; admin forms reject with a message. (Task 1 `clampProgress`, Task 3 progress and admin-action tests.)
2. **A reader with no progress row, or an admin who lowered `totalChapters` below stored progress:** progress reads as 0 / is clamped, not an error. (Task 3 `getProgress` tests.)
3. **A one-chapter thread** (`startChapter === endChapter`): accepted by validation, named "Chapter 7", and shown as `current` only while `finished >= start` and `< end`. (Task 1 helpers tests.)
4. **Leaks of a sealed thread's title:** neither `getSectionsForViewer` nor `getSectionThread` may include `title`, `name`, `label` or `posts` for a locked section. (Task 3 `sections` tests.)
5. **Deleting a book or section that has progress and memberships:** no foreign-key error; `ReadingProgress` rows go with the book. (Task 3 `books` tests.)
6. **Editing a section so its last chapter moves later than a reader's progress:** the reader keeps the thread already unlocked (nothing is re-sealed). (Task 3 `books` tests.)

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/chapters.ts` (new) | Pure helpers: names, validation, clamping, progress-bar segment states |
| `src/lib/progress.ts` (new) | `getProgress`, `setProgress`, `syncUnlocksForBook` (DB) |
| `src/lib/books.ts` (modify) | Book/section CRUD with chapter fields; calls `syncUnlocksForBook` |
| `src/lib/sections.ts` (modify) | Viewer-facing section summaries (sealed shape), thread lookup; `joinSection` removed |
| `src/app/sections/actions.ts` (modify) | `setProgressAction` replaces `joinSectionAction` |
| `src/app/admin/actions.ts` (modify) | Chapter-aware book/section actions |
| `src/components/ProgressStepper.tsx` (new) | Client stepper + segmented bar |
| `src/components/SectionRow.tsx` (new) | One thread row (sealed or open), shared by main and past-books pages |
| `src/app/page.tsx`, `src/app/past-books/page.tsx`, `src/app/sections/[sectionId]/page.tsx`, `src/app/admin/page.tsx` (modify) | Use the above |
| `src/components/JoinSectionButton.tsx` (delete) | No longer used |
| `scripts/migrate-sections.mjs` (new) | One-off backfill of chapter columns from existing labels |
| `prisma/schema.prisma` (modify) | New fields and model |

---

### Task 1: Chapter helpers (pure functions)

**Files:**
- Create: `src/lib/chapters.ts`
- Test: `tests/lib/chapters.test.ts`

**Interfaces:**
- Produces:
  - `chapterRangeName(start: number, end: number): string`
  - `sectionDisplayName(s: { startChapter: number; endChapter: number; title: string | null }): string`
  - `validateChapterRange(input: { startChapter: number; endChapter: number; totalChapters: number }): string | null`
  - `validateTotalChapters(total: number): string | null`
  - `clampProgress(value: number, total: number): number`
  - `type SegmentState = 'done' | 'current' | 'todo'`
  - `segmentStates(sections: { startChapter: number; endChapter: number }[], finished: number): SegmentState[]`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/chapters.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  chapterRangeName,
  sectionDisplayName,
  validateChapterRange,
  validateTotalChapters,
  clampProgress,
  segmentStates,
} from '@/lib/chapters'

describe('chapterRangeName', () => {
  it('names a range', () => {
    expect(chapterRangeName(6, 10)).toBe('Chapters 6 to 10')
  })

  it('names a single-chapter thread in the singular', () => {
    expect(chapterRangeName(7, 7)).toBe('Chapter 7')
  })
})

describe('sectionDisplayName', () => {
  it('appends the title when there is one', () => {
    expect(sectionDisplayName({ startChapter: 6, endChapter: 10, title: 'Lowood' })).toBe('Chapters 6 to 10 · Lowood')
  })

  it('is just the range with no title, or a blank one', () => {
    expect(sectionDisplayName({ startChapter: 6, endChapter: 10, title: null })).toBe('Chapters 6 to 10')
    expect(sectionDisplayName({ startChapter: 6, endChapter: 10, title: '   ' })).toBe('Chapters 6 to 10')
  })
})

describe('validateChapterRange', () => {
  const total = 38

  it('accepts a valid range, including a single chapter and the very last chapter', () => {
    expect(validateChapterRange({ startChapter: 6, endChapter: 10, totalChapters: total })).toBeNull()
    expect(validateChapterRange({ startChapter: 7, endChapter: 7, totalChapters: total })).toBeNull()
    expect(validateChapterRange({ startChapter: 31, endChapter: 38, totalChapters: total })).toBeNull()
  })

  it('rejects a start below 1 or not a whole number', () => {
    expect(validateChapterRange({ startChapter: 0, endChapter: 5, totalChapters: total })).toBe(
      'Start chapter must be a whole number of at least 1'
    )
    expect(validateChapterRange({ startChapter: 1.5, endChapter: 5, totalChapters: total })).toBe(
      'Start chapter must be a whole number of at least 1'
    )
    expect(validateChapterRange({ startChapter: NaN, endChapter: 5, totalChapters: total })).toBe(
      'Start chapter must be a whole number of at least 1'
    )
  })

  it('rejects an end that is not a whole number', () => {
    expect(validateChapterRange({ startChapter: 1, endChapter: NaN, totalChapters: total })).toBe(
      'End chapter must be a whole number'
    )
  })

  it('rejects an end before the start', () => {
    expect(validateChapterRange({ startChapter: 10, endChapter: 6, totalChapters: total })).toBe(
      'End chapter cannot be before the start chapter'
    )
  })

  it('rejects an end past the total', () => {
    expect(validateChapterRange({ startChapter: 31, endChapter: 39, totalChapters: total })).toBe(
      "End chapter cannot be past the book's 38 chapters"
    )
  })
})

describe('validateTotalChapters', () => {
  it('accepts a whole number of at least 1', () => {
    expect(validateTotalChapters(1)).toBeNull()
    expect(validateTotalChapters(38)).toBeNull()
  })

  it('rejects zero, negatives, fractions and NaN', () => {
    const message = 'Total chapters must be a whole number of at least 1'
    expect(validateTotalChapters(0)).toBe(message)
    expect(validateTotalChapters(-4)).toBe(message)
    expect(validateTotalChapters(2.5)).toBe(message)
    expect(validateTotalChapters(NaN)).toBe(message)
  })
})

describe('clampProgress', () => {
  it('keeps an in-range whole number', () => {
    expect(clampProgress(12, 38)).toBe(12)
  })

  it('clamps below 0 and above the total', () => {
    expect(clampProgress(-3, 38)).toBe(0)
    expect(clampProgress(99, 38)).toBe(38)
  })

  it('floors fractions and turns NaN into 0', () => {
    expect(clampProgress(2.7, 38)).toBe(2)
    expect(clampProgress(NaN, 38)).toBe(0)
  })
})

describe('segmentStates', () => {
  const sections = [
    { startChapter: 1, endChapter: 5 },
    { startChapter: 6, endChapter: 10 },
    { startChapter: 11, endChapter: 15 },
    { startChapter: 16, endChapter: 20 },
  ]

  it('marks finished threads done, the one in progress current, the rest todo', () => {
    expect(segmentStates(sections, 12)).toEqual(['done', 'done', 'current', 'todo'])
  })

  it('has no current segment when the reader is exactly between threads', () => {
    expect(segmentStates(sections, 10)).toEqual(['done', 'done', 'todo', 'todo'])
  })

  it('is all todo at 0 and all done at the end', () => {
    expect(segmentStates(sections, 0)).toEqual(['todo', 'todo', 'todo', 'todo'])
    expect(segmentStates(sections, 20)).toEqual(['done', 'done', 'done', 'done'])
  })

  it('treats a one-chapter thread as done once finished, and never current', () => {
    const single = [{ startChapter: 7, endChapter: 7 }]
    expect(segmentStates(single, 6)).toEqual(['todo'])
    expect(segmentStates(single, 7)).toEqual(['done'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/chapters.test.ts`
Expected: FAIL (cannot resolve `@/lib/chapters`).

(Plain `vitest` is fine here: these tests don't touch the database.)

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/chapters.ts`:

```ts
export function chapterRangeName(start: number, end: number): string {
  return start === end ? `Chapter ${start}` : `Chapters ${start} to ${end}`
}

export function sectionDisplayName(s: {
  startChapter: number
  endChapter: number
  title: string | null
}): string {
  const range = chapterRangeName(s.startChapter, s.endChapter)
  const title = s.title?.trim()
  return title ? `${range} · ${title}` : range
}

export function validateChapterRange(input: {
  startChapter: number
  endChapter: number
  totalChapters: number
}): string | null {
  const { startChapter, endChapter, totalChapters } = input
  if (!Number.isInteger(startChapter) || startChapter < 1) {
    return 'Start chapter must be a whole number of at least 1'
  }
  if (!Number.isInteger(endChapter)) {
    return 'End chapter must be a whole number'
  }
  if (endChapter < startChapter) {
    return 'End chapter cannot be before the start chapter'
  }
  if (endChapter > totalChapters) {
    return `End chapter cannot be past the book's ${totalChapters} chapters`
  }
  return null
}

export function validateTotalChapters(total: number): string | null {
  return Number.isInteger(total) && total >= 1 ? null : 'Total chapters must be a whole number of at least 1'
}

export function clampProgress(value: number, total: number): number {
  if (Number.isNaN(value)) return 0
  return Math.min(Math.max(Math.floor(value), 0), total)
}

export type SegmentState = 'done' | 'current' | 'todo'

export function segmentStates(
  sections: { startChapter: number; endChapter: number }[],
  finished: number
): SegmentState[] {
  return sections.map((s) => {
    if (finished >= s.endChapter) return 'done'
    if (finished >= s.startChapter) return 'current'
    return 'todo'
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/chapters.test.ts`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/chapters.ts tests/lib/chapters.test.ts
git commit -m "feat: chapter naming, validation and progress-segment helpers"
```

---

### Task 2: Label-backfill script

Pure parsing and planning are unit-tested; the database part is verified in Task 6.

**Files:**
- Create: `scripts/migrate-sections.mjs`
- Test: `tests/scripts/migrate-sections.test.ts`
- Modify: `package.json` (add one script)

**Interfaces:**
- Produces:
  - `parseChapterLabel(label: string): { startChapter: number; endChapter: number } | null`
  - `planBackfill(sections: { id: string; bookId: string; label: string }[]): { updates: { id: string; startChapter: number; endChapter: number }[]; totals: Record<string, number>; errors: string[] }`
  - `migrate(prisma): Promise<void>` (used by the CLI entry and Task 6)

- [ ] **Step 1: Write the failing test**

Create `tests/scripts/migrate-sections.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseChapterLabel, planBackfill } from '../../scripts/migrate-sections.mjs'

describe('parseChapterLabel', () => {
  it('reads the labels used in the app today', () => {
    expect(parseChapterLabel('Chapters 1-10')).toEqual({ startChapter: 1, endChapter: 10 })
    expect(parseChapterLabel('Chapters 61-75')).toEqual({ startChapter: 61, endChapter: 75 })
  })

  it('tolerates spacing, case, abbreviations, en dashes and "to"', () => {
    expect(parseChapterLabel('  chapters 6 – 10 ')).toEqual({ startChapter: 6, endChapter: 10 })
    expect(parseChapterLabel('Ch 1-5')).toEqual({ startChapter: 1, endChapter: 5 })
    expect(parseChapterLabel('Ch. 1-5')).toEqual({ startChapter: 1, endChapter: 5 })
    expect(parseChapterLabel('Chapters 6 to 10')).toEqual({ startChapter: 6, endChapter: 10 })
  })

  it('reads a single chapter', () => {
    expect(parseChapterLabel('Chapter 7')).toEqual({ startChapter: 7, endChapter: 7 })
  })

  it('returns null for labels it cannot read or that are backwards or start at 0', () => {
    expect(parseChapterLabel('The Gathering')).toBeNull()
    expect(parseChapterLabel('Chapters 10-6')).toBeNull()
    expect(parseChapterLabel('Chapters 0-5')).toBeNull()
    expect(parseChapterLabel('')).toBeNull()
  })
})

describe('planBackfill', () => {
  it('plans an update per section and the highest end chapter per book', () => {
    const plan = planBackfill([
      { id: 's1', bookId: 'b1', label: 'Chapters 1-10' },
      { id: 's2', bookId: 'b1', label: 'Chapters 11-20' },
      { id: 's3', bookId: 'b2', label: 'Chapters 1-5' },
    ])
    expect(plan.errors).toEqual([])
    expect(plan.updates).toEqual([
      { id: 's1', startChapter: 1, endChapter: 10 },
      { id: 's2', startChapter: 11, endChapter: 20 },
      { id: 's3', startChapter: 1, endChapter: 5 },
    ])
    expect(plan.totals).toEqual({ b1: 20, b2: 5 })
  })

  it('reports every unreadable label with its section id and the label text', () => {
    const plan = planBackfill([
      { id: 's1', bookId: 'b1', label: 'Chapters 1-10' },
      { id: 's2', bookId: 'b1', label: 'The Gathering' },
      { id: 's3', bookId: 'b1', label: 'Epilogue' },
    ])
    expect(plan.errors).toHaveLength(2)
    expect(plan.errors[0]).toContain('s2')
    expect(plan.errors[0]).toContain('The Gathering')
    expect(plan.errors[1]).toContain('Epilogue')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/scripts/migrate-sections.test.ts`
Expected: FAIL (cannot resolve `scripts/migrate-sections.mjs`).

- [ ] **Step 3: Write the script**

Create `scripts/migrate-sections.mjs`:

```js
// One-off backfill for the progress-and-unlocking change.
//
// Run it BEFORE pushing the new schema to an existing database:
//   npm run db:backfill-chapters
//   npx prisma db push --accept-data-loss     (drops Section.label, creates ReadingProgress)
//
// It adds the new Section/Book columns, fills them from existing "Chapters 11-20"
// style labels, and sets each book's totalChapters to its highest end chapter.
// If any label cannot be read it aborts before changing anything.
import { PrismaClient } from '@prisma/client'
import { pathToFileURL } from 'node:url'

export function parseChapterLabel(label) {
  const prefix = String.raw`^\s*(?:chapters?|chs?\.?)\s*`
  const range = new RegExp(`${prefix}(\\d+)\\s*(?:-|–|—|to)\\s*(\\d+)\\s*$`, 'i').exec(label)
  const single = new RegExp(`${prefix}(\\d+)\\s*$`, 'i').exec(label)
  const match = range ?? single
  if (!match) return null
  const startChapter = Number(match[1])
  const endChapter = Number(match[2] ?? match[1])
  if (startChapter < 1 || endChapter < startChapter) return null
  return { startChapter, endChapter }
}

export function planBackfill(sections) {
  const updates = []
  const errors = []
  const totals = {}
  for (const section of sections) {
    const parsed = parseChapterLabel(section.label)
    if (!parsed) {
      errors.push(`Section ${section.id} (book ${section.bookId}): cannot read chapters from label "${section.label}"`)
      continue
    }
    updates.push({ id: section.id, ...parsed })
    totals[section.bookId] = Math.max(totals[section.bookId] ?? 0, parsed.endChapter)
  }
  return { updates, totals, errors }
}

async function columnNames(prisma, table) {
  const rows = await prisma.$queryRawUnsafe(`PRAGMA table_info("${table}")`)
  return rows.map((row) => row.name)
}

export async function migrate(prisma) {
  const sectionColumns = await columnNames(prisma, 'Section')
  if (!sectionColumns.includes('label')) {
    console.log('Section.label is already gone; nothing to do.')
    return
  }

  const sections = await prisma.$queryRawUnsafe('SELECT id, bookId, label FROM "Section"')
  const { updates, totals, errors } = planBackfill(sections)
  if (errors.length > 0) {
    throw new Error(`Migration aborted, nothing was changed:\n${errors.join('\n')}`)
  }

  const bookColumns = await columnNames(prisma, 'Book')
  if (!sectionColumns.includes('startChapter')) {
    await prisma.$executeRawUnsafe('ALTER TABLE "Section" ADD COLUMN "startChapter" INTEGER NOT NULL DEFAULT 0')
  }
  if (!sectionColumns.includes('endChapter')) {
    await prisma.$executeRawUnsafe('ALTER TABLE "Section" ADD COLUMN "endChapter" INTEGER NOT NULL DEFAULT 0')
  }
  if (!sectionColumns.includes('title')) {
    await prisma.$executeRawUnsafe('ALTER TABLE "Section" ADD COLUMN "title" TEXT')
  }
  if (!bookColumns.includes('totalChapters')) {
    await prisma.$executeRawUnsafe('ALTER TABLE "Book" ADD COLUMN "totalChapters" INTEGER NOT NULL DEFAULT 0')
  }

  await prisma.$transaction([
    ...updates.map((u) =>
      prisma.$executeRawUnsafe(
        'UPDATE "Section" SET "startChapter" = ?, "endChapter" = ? WHERE "id" = ?',
        u.startChapter,
        u.endChapter,
        u.id
      )
    ),
    ...Object.entries(totals).map(([bookId, total]) =>
      prisma.$executeRawUnsafe('UPDATE "Book" SET "totalChapters" = ? WHERE "id" = ?', total, bookId)
    ),
  ])

  console.log(`Backfilled ${updates.length} section(s) across ${Object.keys(totals).length} book(s).`)
  const empty = await prisma.$queryRawUnsafe('SELECT title FROM "Book" WHERE "totalChapters" = 0')
  for (const book of empty) {
    console.warn(`"${book.title}" has no sections, so its total chapters is 0. Set it in the admin page.`)
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  const prisma = new PrismaClient()
  migrate(prisma)
    .catch((error) => {
      console.error(error.message)
      process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())
}
```

In `package.json`, add this line to `"scripts"` (after `"db:studio"`, remembering the comma on the previous line):

```json
    "db:backfill-chapters": "node scripts/migrate-sections.mjs"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/scripts/migrate-sections.test.ts`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/migrate-sections.mjs tests/scripts/migrate-sections.test.ts package.json
git commit -m "feat: script to backfill chapter ranges from existing section labels"
```

---

### Task 3: Backend (schema, progress, books, sections, actions)

The schema change breaks every fixture that creates a section or book, so this is one task with one commit at the end. Work through the steps in order. Until Tasks 4 and 5 are done, `npx tsc --noEmit` will fail in the UI files only, and the running app won't work.

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/lib/progress.ts`, `tests/lib/progress.test.ts`, `tests/app/section-actions.test.ts`
- Modify: `src/lib/books.ts`, `src/lib/sections.ts`, `src/app/sections/actions.ts`, `src/app/admin/actions.ts`
- Rewrite: `tests/lib/books.test.ts`, `tests/lib/sections.test.ts`
- Modify: `tests/lib/posts.test.ts`, `tests/lib/db.test.ts`, `tests/app/admin-actions.test.ts`

**Interfaces:**
- Consumes (from Task 1): `clampProgress`, `validateChapterRange`, `validateTotalChapters`, `sectionDisplayName`.
- Produces:
  - `getProgress(userId: string, bookId: string): Promise<number>`
  - `setProgress(userId: string, bookId: string, chaptersFinished: number): Promise<number>` (returns the clamped, saved number)
  - `syncUnlocksForBook(bookId: string): Promise<void>`
  - `createBook(input: { title: string; author: string; totalChapters: number; coverUrl?: string })`
  - `addSection(bookId: string, input: { startChapter: number; endChapter: number; title?: string | null })`
  - `updateSection(sectionId: string, input: { startChapter: number; endChapter: number; title?: string | null })` (replaces `updateSectionLabel`)
  - `updateTotalChapters(bookId: string, totalChapters: number)`
  - `SectionSummary` = `{ id; order; status: 'locked'; startChapter; endChapter; chaptersToGo }` | `{ id; order; status: 'unlocked'; startChapter; endChapter; title: string | null; postCount; lastPostAt }`
  - `ThreadResult` = `{ status: 'locked' }` | `{ status: 'unlocked'; name: string; posts: PostWithAuthor[] }`
  - `setProgressAction(bookId: string, chaptersFinished: number): Promise<number>`
  - Admin actions: `createBookAction`, `addSectionAction`, `updateSectionAction` (replaces `updateSectionLabelAction`), `updateTotalChaptersAction`

#### 3A. Schema

- [ ] **Step 1: Edit `prisma/schema.prisma`**

In `model User`, add after `posts       Post[]`:

```prisma
  progress    ReadingProgress[]
```

In `model Book`, add `totalChapters` after `author String` and a relation after `cover    BookCover?`:

```prisma
  totalChapters Int
```
```prisma
  progress ReadingProgress[]
```

In `model Section`, replace `label     String` with:

```prisma
  startChapter Int
  endChapter   Int
  title        String?
```

Add this model at the end of the file:

```prisma
model ReadingProgress {
  userId           String
  bookId           String
  chaptersFinished Int      @default(0)
  updatedAt        DateTime @updatedAt

  user User @relation(fields: [userId], references: [id])
  book Book @relation(fields: [bookId], references: [id])

  @@id([userId, bookId])
}
```

- [ ] **Step 2: Regenerate the client**

Run: `npx prisma generate`
Expected: "Generated Prisma Client".

#### 3B. Progress library

- [ ] **Step 3: Write the failing test**

Create `tests/lib/progress.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { getProgress, setProgress, syncUnlocksForBook } from '@/lib/progress'

async function setup() {
  const book = await prisma.book.create({
    data: {
      title: 'Jane Eyre',
      author: 'Charlotte Brontë',
      totalChapters: 38,
      sections: {
        create: [
          { startChapter: 1, endChapter: 5, order: 1 },
          { startChapter: 6, endChapter: 10, order: 2 },
          { startChapter: 11, endChapter: 15, order: 3 },
        ],
      },
    },
    include: { sections: { orderBy: { order: 'asc' } } },
  })
  const user = await prisma.user.create({ data: { googleId: 'g-prog', email: 'prog@example.com' } })
  return { book, user }
}

async function unlockedSectionIds(userId: string) {
  const rows = await prisma.threadMembership.findMany({ where: { userId } })
  return rows.map((r) => r.sectionId).sort()
}

describe('progress', () => {
  beforeEach(async () => {
    await prisma.readingProgress.deleteMany()
    await prisma.post.deleteMany()
    await prisma.threadMembership.deleteMany()
    await prisma.section.deleteMany()
    await prisma.book.deleteMany()
    await prisma.user.deleteMany()
  })

  it('unlocks exactly the sections whose last chapter is at or below the number', async () => {
    const { book, user } = await setup()

    const saved = await setProgress(user.id, book.id, 10)

    expect(saved).toBe(10)
    expect(await unlockedSectionIds(user.id)).toEqual([book.sections[0].id, book.sections[1].id].sort())
  })

  it('does not unlock a section the reader is only partway through', async () => {
    const { book, user } = await setup()

    await setProgress(user.id, book.id, 14)

    expect(await unlockedSectionIds(user.id)).toEqual([book.sections[0].id, book.sections[1].id].sort())
  })

  it('keeps threads open when the number is lowered', async () => {
    const { book, user } = await setup()
    await setProgress(user.id, book.id, 12)

    await setProgress(user.id, book.id, 3)

    expect(await getProgress(user.id, book.id)).toBe(3)
    expect(await unlockedSectionIds(user.id)).toEqual([book.sections[0].id, book.sections[1].id].sort())
  })

  it('clamps to 0..totalChapters, floors fractions, and turns NaN into 0', async () => {
    const { book, user } = await setup()

    expect(await setProgress(user.id, book.id, 99)).toBe(38)
    expect(await setProgress(user.id, book.id, -3)).toBe(0)
    expect(await setProgress(user.id, book.id, 2.7)).toBe(2)
    expect(await setProgress(user.id, book.id, NaN)).toBe(0)
    expect(await getProgress(user.id, book.id)).toBe(0)
  })

  it('is idempotent: saving the same number twice keeps one progress row and no duplicate memberships', async () => {
    const { book, user } = await setup()

    await setProgress(user.id, book.id, 10)
    await setProgress(user.id, book.id, 10)

    expect(await prisma.readingProgress.count()).toBe(1)
    expect(await prisma.threadMembership.count()).toBe(2)
  })

  it('reads as 0 for a reader with no progress row', async () => {
    const { book, user } = await setup()
    expect(await getProgress(user.id, book.id)).toBe(0)
  })

  it('clamps what it reads when the admin has since lowered the total', async () => {
    const { book, user } = await setup()
    await prisma.readingProgress.create({ data: { userId: user.id, bookId: book.id, chaptersFinished: 30 } })
    await prisma.book.update({ where: { id: book.id }, data: { totalChapters: 20 } })

    expect(await getProgress(user.id, book.id)).toBe(20)
  })

  it('keeps progress per book', async () => {
    const { book, user } = await setup()
    const other = await prisma.book.create({ data: { title: 'Emma', author: 'Austen', totalChapters: 55 } })

    await setProgress(user.id, book.id, 12)

    expect(await getProgress(user.id, other.id)).toBe(0)
  })

  it('syncUnlocksForBook unlocks a new section for readers who are already far enough along, and only them', async () => {
    const { book, user } = await setup()
    const behind = await prisma.user.create({ data: { googleId: 'g-behind', email: 'behind@example.com' } })
    await setProgress(user.id, book.id, 12)
    await setProgress(behind.id, book.id, 3)
    const added = await prisma.section.create({
      data: { bookId: book.id, startChapter: 8, endChapter: 12, order: 4 },
    })

    await syncUnlocksForBook(book.id)

    expect(await unlockedSectionIds(user.id)).toContain(added.id)
    expect(await unlockedSectionIds(behind.id)).not.toContain(added.id)
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test -- tests/lib/progress.test.ts`
Expected: FAIL (cannot resolve `@/lib/progress`).

- [ ] **Step 5: Write minimal implementation**

Create `src/lib/progress.ts`:

```ts
import { prisma } from '@/lib/db'
import { clampProgress } from '@/lib/chapters'

export async function getProgress(userId: string, bookId: string): Promise<number> {
  const [book, row] = await Promise.all([
    prisma.book.findUniqueOrThrow({ where: { id: bookId }, select: { totalChapters: true } }),
    prisma.readingProgress.findUnique({ where: { userId_bookId: { userId, bookId } } }),
  ])
  return clampProgress(row?.chaptersFinished ?? 0, book.totalChapters)
}

// Saves the reader's number and unlocks every thread whose last chapter they have reached.
// Memberships are only ever added here, so lowering the number never re-seals a thread.
export async function setProgress(userId: string, bookId: string, chaptersFinished: number): Promise<number> {
  const book = await prisma.book.findUniqueOrThrow({ where: { id: bookId }, select: { totalChapters: true } })
  const value = clampProgress(chaptersFinished, book.totalChapters)

  await prisma.$transaction(async (tx) => {
    await tx.readingProgress.upsert({
      where: { userId_bookId: { userId, bookId } },
      update: { chaptersFinished: value },
      create: { userId, bookId, chaptersFinished: value },
    })
    const reached = await tx.section.findMany({
      where: { bookId, endChapter: { lte: value } },
      select: { id: true },
    })
    for (const section of reached) {
      await tx.threadMembership.upsert({
        where: { userId_sectionId: { userId, sectionId: section.id } },
        update: {},
        create: { userId, sectionId: section.id },
      })
    }
  })

  return value
}

// Re-runs the unlock check for everyone with progress in this book. Call it after the
// admin adds or edits a section so readers who are already far enough along get it.
export async function syncUnlocksForBook(bookId: string): Promise<void> {
  const book = await prisma.book.findUniqueOrThrow({
    where: { id: bookId },
    select: {
      totalChapters: true,
      sections: { select: { id: true, endChapter: true } },
      progress: { select: { userId: true, chaptersFinished: true } },
    },
  })

  await prisma.$transaction(async (tx) => {
    for (const row of book.progress) {
      const finished = clampProgress(row.chaptersFinished, book.totalChapters)
      for (const section of book.sections) {
        if (section.endChapter > finished) continue
        await tx.threadMembership.upsert({
          where: { userId_sectionId: { userId: row.userId, sectionId: section.id } },
          update: {},
          create: { userId: row.userId, sectionId: section.id },
        })
      }
    }
  })
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- tests/lib/progress.test.ts`
Expected: PASS (all tests).

#### 3C. Books library

- [ ] **Step 7: Replace `tests/lib/books.test.ts` with**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import {
  listBooks,
  createBook,
  addSection,
  setBookStatus,
  updateSection,
  updateTotalChapters,
  deleteSection,
  deleteBook,
} from '@/lib/books'
import { setProgress } from '@/lib/progress'

async function newBook(totalChapters = 30) {
  return createBook({ title: 'Dune', author: 'Frank Herbert', totalChapters })
}

describe('books', () => {
  beforeEach(async () => {
    await prisma.readingProgress.deleteMany()
    await prisma.post.deleteMany()
    await prisma.threadMembership.deleteMany()
    await prisma.section.deleteMany()
    await prisma.book.deleteMany()
    await prisma.user.deleteMany()
  })

  it('creates a book as current by default, with its total chapters', async () => {
    const book = await newBook(38)
    expect(book.status).toBe('current')
    expect(book.totalChapters).toBe(38)
  })

  it('rejects a book whose total chapters is not a whole number of at least 1', async () => {
    await expect(newBook(0)).rejects.toThrow('Total chapters')
    await expect(newBook(NaN)).rejects.toThrow('Total chapters')
  })

  it('adds sections to a book in creation order', async () => {
    const book = await newBook()
    await addSection(book.id, { startChapter: 1, endChapter: 5 })
    await addSection(book.id, { startChapter: 6, endChapter: 10, title: 'Lowood' })

    const [found] = await listBooks('current')
    expect(found.sections.map((s) => [s.startChapter, s.endChapter, s.title])).toEqual([
      [1, 5, null],
      [6, 10, 'Lowood'],
    ])
    expect(found.sections.map((s) => s.order)).toEqual([1, 2])
  })

  it('stores a blank title as no title', async () => {
    const book = await newBook()
    const section = await addSection(book.id, { startChapter: 1, endChapter: 5, title: '   ' })
    expect(section.title).toBeNull()
  })

  it('rejects a section outside the chapter bounds', async () => {
    const book = await newBook(30)
    await expect(addSection(book.id, { startChapter: 10, endChapter: 6 })).rejects.toThrow('before the start')
    await expect(addSection(book.id, { startChapter: 0, endChapter: 6 })).rejects.toThrow('Start chapter')
    await expect(addSection(book.id, { startChapter: 28, endChapter: 31 })).rejects.toThrow('past the book')
    expect(await prisma.section.count()).toBe(0)
  })

  it('accepts a single-chapter section', async () => {
    const book = await newBook()
    const section = await addSection(book.id, { startChapter: 7, endChapter: 7 })
    expect(section.startChapter).toBe(7)
  })

  it('keeps assigning the next order after a section in the middle is deleted', async () => {
    const book = await newBook()
    const first = await addSection(book.id, { startChapter: 1, endChapter: 5 })
    await addSection(book.id, { startChapter: 6, endChapter: 10 })
    await deleteSection(first.id)

    const third = await addSection(book.id, { startChapter: 11, endChapter: 15 })

    expect(third.order).toBe(3)
  })

  it('filters by status', async () => {
    const current = await newBook()
    const past = await createBook({ title: 'Old Book', author: 'Someone', totalChapters: 10 })
    await setBookStatus(past.id, 'past')

    expect((await listBooks('current')).map((b) => b.id)).toEqual([current.id])
    expect((await listBooks('past')).map((b) => b.id)).toEqual([past.id])
  })

  it("includes each section's post count", async () => {
    const book = await newBook()
    const section = await addSection(book.id, { startChapter: 1, endChapter: 5 })
    const user = await prisma.user.create({ data: { googleId: 'g-books-1', email: 'books1@example.com' } })
    await prisma.post.create({ data: { sectionId: section.id, userId: user.id, body: 'Hi' } })
    await prisma.post.create({ data: { sectionId: section.id, userId: user.id, body: 'Hi again' } })

    const [found] = await listBooks('current')
    expect(found.sections[0]._count.posts).toBe(2)
  })

  it("updates a section's range and title", async () => {
    const book = await newBook()
    const section = await addSection(book.id, { startChapter: 1, endChapter: 5 })

    await updateSection(section.id, { startChapter: 1, endChapter: 6, title: 'Gateshead' })

    const [found] = await listBooks('current')
    expect(found.sections[0]).toMatchObject({ startChapter: 1, endChapter: 6, title: 'Gateshead' })
  })

  it('rejects an update outside the chapter bounds and leaves the section alone', async () => {
    const book = await newBook(30)
    const section = await addSection(book.id, { startChapter: 1, endChapter: 5 })

    await expect(updateSection(section.id, { startChapter: 1, endChapter: 31 })).rejects.toThrow('past the book')

    const [found] = await listBooks('current')
    expect(found.sections[0].endChapter).toBe(5)
  })

  it('unlocks a newly added section for readers who are already far enough along', async () => {
    const book = await newBook()
    const user = await prisma.user.create({ data: { googleId: 'g-books-3', email: 'books3@example.com' } })
    await setProgress(user.id, book.id, 12)

    const section = await addSection(book.id, { startChapter: 6, endChapter: 10 })

    const membership = await prisma.threadMembership.findUnique({
      where: { userId_sectionId: { userId: user.id, sectionId: section.id } },
    })
    expect(membership).not.toBeNull()
  })

  it('unlocks a thread for a reader when an edit brings its last chapter within their progress', async () => {
    const book = await newBook()
    const user = await prisma.user.create({ data: { googleId: 'g-books-4', email: 'books4@example.com' } })
    const section = await addSection(book.id, { startChapter: 6, endChapter: 20 })
    await setProgress(user.id, book.id, 12)
    expect(await prisma.threadMembership.count({ where: { sectionId: section.id } })).toBe(0)

    await updateSection(section.id, { startChapter: 6, endChapter: 12 })

    expect(await prisma.threadMembership.count({ where: { sectionId: section.id } })).toBe(1)
  })

  it('does not re-seal a thread when an edit moves its last chapter past the reader', async () => {
    const book = await newBook()
    const user = await prisma.user.create({ data: { googleId: 'g-books-5', email: 'books5@example.com' } })
    const section = await addSection(book.id, { startChapter: 6, endChapter: 10 })
    await setProgress(user.id, book.id, 12)
    expect(await prisma.threadMembership.count({ where: { sectionId: section.id } })).toBe(1)

    await updateSection(section.id, { startChapter: 6, endChapter: 20 })

    expect(await prisma.threadMembership.count({ where: { sectionId: section.id } })).toBe(1)
  })

  it("updates a book's total chapters", async () => {
    const book = await newBook(30)
    await updateTotalChapters(book.id, 40)
    expect((await prisma.book.findUniqueOrThrow({ where: { id: book.id } })).totalChapters).toBe(40)
  })

  it('refuses a total below where the last thread ends, or an invalid total', async () => {
    const book = await newBook(30)
    await addSection(book.id, { startChapter: 21, endChapter: 30 })

    await expect(updateTotalChapters(book.id, 25)).rejects.toThrow('cannot be less than 30')
    await expect(updateTotalChapters(book.id, 0)).rejects.toThrow('Total chapters')
    expect((await prisma.book.findUniqueOrThrow({ where: { id: book.id } })).totalChapters).toBe(30)
  })

  it('allows lowering the total when there are no sections beyond it', async () => {
    const book = await newBook(30)
    await updateTotalChapters(book.id, 12)
    expect((await prisma.book.findUniqueOrThrow({ where: { id: book.id } })).totalChapters).toBe(12)
  })

  it('deletes an empty section', async () => {
    const book = await newBook()
    const section = await addSection(book.id, { startChapter: 1, endChapter: 5 })

    await deleteSection(section.id)

    const [found] = await listBooks('current')
    expect(found.sections).toHaveLength(0)
  })

  it('deletes a section along with its posts and memberships', async () => {
    const book = await newBook()
    const section = await addSection(book.id, { startChapter: 1, endChapter: 5 })
    const user = await prisma.user.create({ data: { googleId: 'g-books-2', email: 'books2@example.com' } })
    await prisma.threadMembership.create({ data: { userId: user.id, sectionId: section.id } })
    await prisma.post.create({ data: { sectionId: section.id, userId: user.id, body: 'Spoilers!' } })

    await deleteSection(section.id)

    expect(await prisma.section.findUnique({ where: { id: section.id } })).toBeNull()
    expect(await prisma.post.count({ where: { sectionId: section.id } })).toBe(0)
    expect(await prisma.threadMembership.count({ where: { sectionId: section.id } })).toBe(0)
  })

  it('deletes a book along with its sections, posts, memberships and reading progress, leaving other books alone', async () => {
    const doomed = await newBook()
    const kept = await createBook({ title: 'Emma', author: 'Jane Austen', totalChapters: 30 })
    const doomedSection = await addSection(doomed.id, { startChapter: 1, endChapter: 5 })
    const keptSection = await addSection(kept.id, { startChapter: 1, endChapter: 5 })
    const user = await prisma.user.create({ data: { googleId: 'g-books-del', email: 'booksdel@example.com' } })
    await setProgress(user.id, doomed.id, 12)
    await setProgress(user.id, kept.id, 8)
    const top = await prisma.post.create({ data: { sectionId: doomedSection.id, userId: user.id, body: 'Hi' } })
    await prisma.post.create({ data: { sectionId: doomedSection.id, userId: user.id, body: 'Re', parentPostId: top.id } })
    await prisma.post.create({ data: { sectionId: keptSection.id, userId: user.id, body: 'Keep me' } })

    await deleteBook(doomed.id)

    expect((await prisma.book.findMany()).map((b) => b.id)).toEqual([kept.id])
    expect((await prisma.section.findMany()).map((s) => s.id)).toEqual([keptSection.id])
    expect(await prisma.post.count()).toBe(1)
    expect((await prisma.readingProgress.findMany()).map((p) => p.bookId)).toEqual([kept.id])
    expect((await prisma.threadMembership.findMany()).map((m) => m.sectionId)).toEqual([keptSection.id])
  })

  it('deletes a book that has no sections', async () => {
    const book = await newBook()
    await deleteBook(book.id)
    expect(await prisma.book.count()).toBe(0)
  })
})
```

- [ ] **Step 8: Run test to verify it fails**

Run: `npm test -- tests/lib/books.test.ts`
Expected: FAIL (`updateSection` / `updateTotalChapters` are not exported; `createBook` ignores `totalChapters`).

- [ ] **Step 9: Replace `src/lib/books.ts` with**

```ts
import { prisma } from '@/lib/db'
import { validateChapterRange, validateTotalChapters } from '@/lib/chapters'
import { syncUnlocksForBook } from '@/lib/progress'

type SectionInput = { startChapter: number; endChapter: number; title?: string | null }

function cleanTitle(title: string | null | undefined): string | null {
  const trimmed = title?.trim()
  return trimmed ? trimmed : null
}

export async function listBooks(status?: 'current' | 'past') {
  return prisma.book.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    include: {
      sections: {
        orderBy: { order: 'asc' },
        include: { _count: { select: { posts: true } } },
      },
      // Only the timestamp, never the image bytes; it doubles as a cache-busting version.
      cover: { select: { updatedAt: true } },
    },
  })
}

export async function createBook(input: { title: string; author: string; totalChapters: number; coverUrl?: string }) {
  const problem = validateTotalChapters(input.totalChapters)
  if (problem) throw new Error(problem)
  return prisma.book.create({ data: { ...input, status: 'current' } })
}

export async function addSection(bookId: string, input: SectionInput) {
  const book = await prisma.book.findUniqueOrThrow({ where: { id: bookId } })
  const problem = validateChapterRange({
    startChapter: input.startChapter,
    endChapter: input.endChapter,
    totalChapters: book.totalChapters,
  })
  if (problem) throw new Error(problem)

  const { _max } = await prisma.section.aggregate({
    where: { bookId },
    _max: { order: true },
  })
  const order = (_max.order ?? 0) + 1
  const section = await prisma.section.create({
    data: {
      bookId,
      startChapter: input.startChapter,
      endChapter: input.endChapter,
      title: cleanTitle(input.title),
      order,
    },
  })
  await syncUnlocksForBook(bookId)
  return section
}

export async function setBookStatus(bookId: string, status: 'current' | 'past') {
  return prisma.book.update({ where: { id: bookId }, data: { status } })
}

export async function updateSection(sectionId: string, input: SectionInput) {
  const existing = await prisma.section.findUniqueOrThrow({ where: { id: sectionId }, include: { book: true } })
  const problem = validateChapterRange({
    startChapter: input.startChapter,
    endChapter: input.endChapter,
    totalChapters: existing.book.totalChapters,
  })
  if (problem) throw new Error(problem)

  const section = await prisma.section.update({
    where: { id: sectionId },
    data: {
      startChapter: input.startChapter,
      endChapter: input.endChapter,
      title: cleanTitle(input.title),
    },
  })
  await syncUnlocksForBook(existing.bookId)
  return section
}

export async function updateTotalChapters(bookId: string, totalChapters: number) {
  const problem = validateTotalChapters(totalChapters)
  if (problem) throw new Error(problem)

  const { _max } = await prisma.section.aggregate({ where: { bookId }, _max: { endChapter: true } })
  if (_max.endChapter !== null && totalChapters < _max.endChapter) {
    throw new Error(`Total chapters cannot be less than ${_max.endChapter}, where the last thread ends`)
  }
  return prisma.book.update({ where: { id: bookId }, data: { totalChapters } })
}

export async function deleteSection(sectionId: string): Promise<void> {
  await prisma.$transaction([
    prisma.post.deleteMany({ where: { sectionId } }),
    prisma.threadMembership.deleteMany({ where: { sectionId } }),
    prisma.section.delete({ where: { id: sectionId } }),
  ])
}

export async function deleteBook(bookId: string): Promise<void> {
  const sectionIds = (await prisma.section.findMany({ where: { bookId }, select: { id: true } })).map((s) => s.id)
  await prisma.$transaction([
    prisma.bookCover.deleteMany({ where: { bookId } }),
    prisma.post.deleteMany({ where: { sectionId: { in: sectionIds } } }),
    prisma.threadMembership.deleteMany({ where: { sectionId: { in: sectionIds } } }),
    prisma.readingProgress.deleteMany({ where: { bookId } }),
    prisma.section.deleteMany({ where: { bookId } }),
    prisma.book.delete({ where: { id: bookId } }),
  ])
}
```

- [ ] **Step 10: Run test to verify it passes**

Run: `npm test -- tests/lib/books.test.ts`
Expected: PASS (all tests).

#### 3D. Sections library

- [ ] **Step 11: Replace `tests/lib/sections.test.ts` with**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { getSectionsForViewer, getSectionThread } from '@/lib/sections'

async function resetDb() {
  await prisma.readingProgress.deleteMany()
  await prisma.post.deleteMany()
  await prisma.threadMembership.deleteMany()
  await prisma.section.deleteMany()
  await prisma.book.deleteMany()
  await prisma.user.deleteMany()
}

async function unlock(userId: string, sectionId: string) {
  await prisma.threadMembership.create({ data: { userId, sectionId } })
}

describe('getSectionsForViewer', () => {
  beforeEach(resetDb)

  it('returns a sealed section as only its range and chapters to go, with no title, posts or label', async () => {
    const book = await prisma.book.create({
      data: {
        title: 'Dune',
        author: 'Herbert',
        totalChapters: 30,
        sections: { create: [{ startChapter: 11, endChapter: 15, title: 'Lowood', order: 1 }] },
      },
      include: { sections: true },
    })
    const author = await prisma.user.create({ data: { googleId: 'g-1', email: 'author@example.com' } })
    const viewer = await prisma.user.create({ data: { googleId: 'g-2', email: 'viewer@example.com' } })
    await prisma.post.create({ data: { sectionId: book.sections[0].id, userId: author.id, body: 'Spoiler!' } })

    const summaries = await getSectionsForViewer(book.id, viewer.id)

    expect(summaries).toEqual([
      { id: book.sections[0].id, order: 1, status: 'locked', startChapter: 11, endChapter: 15, chaptersToGo: 15 },
    ])
    for (const leaked of ['title', 'label', 'name', 'posts', 'postCount', 'lastPostAt']) {
      expect(summaries[0]).not.toHaveProperty(leaked)
    }
    expect(JSON.stringify(summaries)).not.toContain('Lowood')
  })

  it("counts chapters to go from the viewer's progress", async () => {
    const book = await prisma.book.create({
      data: {
        title: 'Dune',
        author: 'Herbert',
        totalChapters: 30,
        sections: { create: [{ startChapter: 21, endChapter: 25, order: 1 }] },
      },
    })
    const viewer = await prisma.user.create({ data: { googleId: 'g-go', email: 'go@example.com' } })
    await prisma.readingProgress.create({ data: { userId: viewer.id, bookId: book.id, chaptersFinished: 12 } })

    const [summary] = await getSectionsForViewer(book.id, viewer.id)

    expect(summary).toMatchObject({ status: 'locked', chaptersToGo: 13 })
  })

  it('reports the newest post time as lastPostAt for unlocked sections, and null when there are no posts', async () => {
    const book = await prisma.book.create({
      data: {
        title: 'Dune',
        author: 'Herbert',
        totalChapters: 30,
        sections: {
          create: [
            { startChapter: 1, endChapter: 5, order: 1 },
            { startChapter: 6, endChapter: 10, order: 2 },
          ],
        },
      },
      include: { sections: { orderBy: { order: 'asc' } } },
    })
    const viewer = await prisma.user.create({ data: { googleId: 'g-last', email: 'last@example.com' } })
    for (const section of book.sections) {
      await unlock(viewer.id, section.id)
    }
    const older = new Date('2026-01-01T00:00:00Z')
    const newer = new Date('2026-02-01T00:00:00Z')
    await prisma.post.create({ data: { sectionId: book.sections[0].id, userId: viewer.id, body: 'a', createdAt: newer } })
    await prisma.post.create({ data: { sectionId: book.sections[0].id, userId: viewer.id, body: 'b', createdAt: older } })

    const [withPosts, empty] = await getSectionsForViewer(book.id, viewer.id)

    expect(withPosts).toMatchObject({ postCount: 2, lastPostAt: newer })
    expect(empty).toMatchObject({ postCount: 0, lastPostAt: null })
  })

  it('returns an unlocked section with its title and post count', async () => {
    const book = await prisma.book.create({
      data: {
        title: 'Dune',
        author: 'Herbert',
        totalChapters: 30,
        sections: { create: [{ startChapter: 1, endChapter: 5, title: 'Gateshead', order: 1 }] },
      },
      include: { sections: true },
    })
    const viewer = await prisma.user.create({ data: { googleId: 'g-3', email: 'viewer2@example.com' } })
    await unlock(viewer.id, book.sections[0].id)
    const post = await prisma.post.create({ data: { sectionId: book.sections[0].id, userId: viewer.id, body: 'Hi' } })

    const summaries = await getSectionsForViewer(book.id, viewer.id)

    expect(summaries[0]).toEqual({
      id: book.sections[0].id,
      order: 1,
      status: 'unlocked',
      startChapter: 1,
      endChapter: 5,
      title: 'Gateshead',
      postCount: 1,
      lastPostAt: post.createdAt,
    })
  })

  it('orders sections by their order field', async () => {
    const book = await prisma.book.create({
      data: {
        title: 'Dune',
        author: 'Herbert',
        totalChapters: 30,
        sections: {
          create: [
            { startChapter: 6, endChapter: 10, order: 2 },
            { startChapter: 1, endChapter: 5, order: 1 },
          ],
        },
      },
    })
    const viewer = await prisma.user.create({ data: { googleId: 'g-4', email: 'viewer3@example.com' } })

    const summaries = await getSectionsForViewer(book.id, viewer.id)

    expect(summaries.map((s) => s.startChapter)).toEqual([1, 6])
  })
})

describe('getSectionThread', () => {
  beforeEach(resetDb)

  async function setup() {
    const book = await prisma.book.create({
      data: {
        title: 'Dune',
        author: 'Herbert',
        totalChapters: 30,
        sections: { create: [{ startChapter: 6, endChapter: 10, title: 'Lowood', order: 1 }] },
      },
      include: { sections: true },
    })
    return book.sections[0].id
  }

  it('returns only the status when the viewer has not unlocked the thread', async () => {
    const sectionId = await setup()
    const author = await prisma.user.create({ data: { googleId: 'g-7', email: 'author2@example.com' } })
    const viewer = await prisma.user.create({ data: { googleId: 'g-8', email: 'viewer4@example.com' } })
    await prisma.post.create({ data: { sectionId, userId: author.id, body: 'Spoiler!' } })

    const result = await getSectionThread(sectionId, viewer.id)

    expect(result).toEqual({ status: 'locked' })
    expect(JSON.stringify(result)).not.toContain('Lowood')
  })

  it('returns the display name and posts once the thread is unlocked', async () => {
    const sectionId = await setup()
    const viewer = await prisma.user.create({ data: { googleId: 'g-9', email: 'viewer5@example.com' } })
    await unlock(viewer.id, sectionId)
    await prisma.post.create({ data: { sectionId, userId: viewer.id, body: 'Hi all' } })

    const result = await getSectionThread(sectionId, viewer.id)

    expect(result.status).toBe('unlocked')
    if (result.status === 'unlocked') {
      expect(result.name).toBe('Chapters 6 to 10 · Lowood')
      expect(result.posts).toHaveLength(1)
      expect(result.posts[0].body).toBe('Hi all')
    }
  })
})
```

- [ ] **Step 12: Run test to verify it fails**

Run: `npm test -- tests/lib/sections.test.ts`
Expected: FAIL (old shape: `label`, `joinSection`).

- [ ] **Step 13: Replace `src/lib/sections.ts` with**

```ts
import { prisma } from '@/lib/db'
import { sectionDisplayName } from '@/lib/chapters'
import { getProgress } from '@/lib/progress'

// A sealed thread exposes only its chapter range and how far away it is. Its title and
// posts must never reach the page: this shape is the server-side guarantee of that.
export type SectionSummary =
  | { id: string; order: number; status: 'locked'; startChapter: number; endChapter: number; chaptersToGo: number }
  | {
      id: string
      order: number
      status: 'unlocked'
      startChapter: number
      endChapter: number
      title: string | null
      postCount: number
      lastPostAt: Date | null
    }

export type PostWithAuthor = {
  id: string
  body: string
  parentPostId: string | null
  createdAt: Date
  user: { id: string; name: string | null; avatarUrl: string | null }
}

export type ThreadResult =
  | { status: 'locked' }
  | { status: 'unlocked'; name: string; posts: PostWithAuthor[] }

export async function getSectionsForViewer(bookId: string, userId: string): Promise<SectionSummary[]> {
  const finished = await getProgress(userId, bookId)
  const sections = await prisma.section.findMany({
    where: { bookId },
    orderBy: { order: 'asc' },
    include: {
      memberships: { where: { userId } },
      _count: { select: { posts: true } },
      posts: { select: { createdAt: true }, orderBy: { createdAt: 'desc' }, take: 1 },
    },
  })

  return sections.map((section): SectionSummary => {
    const unlocked = section.memberships.length > 0
    if (!unlocked) {
      return {
        id: section.id,
        order: section.order,
        status: 'locked',
        startChapter: section.startChapter,
        endChapter: section.endChapter,
        chaptersToGo: Math.max(0, section.endChapter - finished),
      }
    }
    return {
      id: section.id,
      order: section.order,
      status: 'unlocked',
      startChapter: section.startChapter,
      endChapter: section.endChapter,
      title: section.title,
      postCount: section._count.posts,
      lastPostAt: section.posts[0]?.createdAt ?? null,
    }
  })
}

export async function getSectionThread(sectionId: string, userId: string): Promise<ThreadResult> {
  const section = await prisma.section.findUniqueOrThrow({ where: { id: sectionId } })
  const membership = await prisma.threadMembership.findUnique({
    where: { userId_sectionId: { userId, sectionId } },
  })

  if (!membership) {
    return { status: 'locked' }
  }

  const posts = await prisma.post.findMany({
    where: { sectionId },
    orderBy: { createdAt: 'asc' },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  })

  return { status: 'unlocked', name: sectionDisplayName(section), posts }
}
```

- [ ] **Step 14: Run test to verify it passes**

Run: `npm test -- tests/lib/sections.test.ts`
Expected: PASS (all tests).

#### 3E. Remaining fixtures

- [ ] **Step 15: Update `tests/lib/posts.test.ts`**

Run these two commands:

```bash
sed -i "s/label: 'Ch 1-5'/startChapter: 1, endChapter: 5/g; s/joinSection(/unlock(/g; /import { joinSection }/d" tests/lib/posts.test.ts
sed -i "s/data: { title: 'Dune', author: 'Herbert', sections:/data: { title: 'Dune', author: 'Herbert', totalChapters: 30, sections:/g" tests/lib/posts.test.ts
```

Then add this helper right after the imports at the top of `tests/lib/posts.test.ts` (it keeps `joinSection`'s idempotent behavior, since the old function is gone):

```ts
async function unlock(userId: string, sectionId: string) {
  await prisma.threadMembership.upsert({
    where: { userId_sectionId: { userId, sectionId } },
    update: {},
    create: { userId, sectionId },
  })
}
```

Run `npx tsc --noEmit 2>&1 | grep tests/lib/posts.test.ts`. For each remaining error (a `prisma.book.create` that still lacks `totalChapters`), add `totalChapters: 30`. Expected when clean: no output for that file.

- [ ] **Step 16: Update `tests/lib/db.test.ts`**

Run:

```bash
sed -i "s/label: 'Chapters 1-5'/startChapter: 1, endChapter: 5/g" tests/lib/db.test.ts
sed -i "s/author: 'Frank Herbert',/author: 'Frank Herbert', totalChapters: 30,/g" tests/lib/db.test.ts
sed -i "s/expect(found.section.label).toBe('Chapters 1-5')/expect(found.section).toMatchObject({ startChapter: 1, endChapter: 5 })/" tests/lib/db.test.ts
```

Add `await prisma.readingProgress.deleteMany()` as the first line of the `beforeEach` in that file. Then run `npx tsc --noEmit 2>&1 | grep tests/lib/db.test.ts`. If any `prisma.book.create` is still missing `totalChapters`, add `totalChapters: 30`. Expected when clean: no output for that file.

- [ ] **Step 17: Run the lib tests**

Run: `npm test -- tests/lib`
Expected: PASS for every file under `tests/lib` (the `admin.test.ts`, `allowlist.test.ts`, `covers.test.ts`, `initials.test.ts`, `session.test.ts` and `time.test.ts` files are unaffected).

#### 3F. Server actions

- [ ] **Step 18: Write the failing test for `setProgressAction`**

Create `tests/app/section-actions.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'

const mockRequireUser = vi.fn()
vi.mock('@/lib/session', () => ({ requireUser: () => mockRequireUser() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { setProgressAction } from '@/app/sections/actions'

describe('setProgressAction', () => {
  beforeEach(async () => {
    mockRequireUser.mockReset()
    await prisma.readingProgress.deleteMany()
    await prisma.post.deleteMany()
    await prisma.threadMembership.deleteMany()
    await prisma.section.deleteMany()
    await prisma.book.deleteMany()
    await prisma.user.deleteMany()
  })

  async function setup() {
    const book = await prisma.book.create({
      data: {
        title: 'Jane Eyre',
        author: 'Brontë',
        totalChapters: 38,
        sections: { create: [{ startChapter: 1, endChapter: 5, order: 1 }] },
      },
    })
    const user = await prisma.user.create({ data: { googleId: 'g-act', email: 'act@example.com' } })
    return { book, user }
  }

  it('saves nothing for a signed-out visitor', async () => {
    const { book } = await setup()
    mockRequireUser.mockRejectedValue(new Error('Not signed in'))

    await expect(setProgressAction(book.id, 10)).rejects.toThrow('Not signed in')
    expect(await prisma.readingProgress.count()).toBe(0)
  })

  it('saves the clamped number for the signed-in user, unlocks threads, and returns the saved number', async () => {
    const { book, user } = await setup()
    mockRequireUser.mockResolvedValue({ id: user.id })

    expect(await setProgressAction(book.id, 99)).toBe(38)

    expect((await prisma.readingProgress.findMany()).map((p) => p.chaptersFinished)).toEqual([38])
    expect(await prisma.threadMembership.count({ where: { userId: user.id } })).toBe(1)
  })
})
```

- [ ] **Step 19: Run test to verify it fails**

Run: `npm test -- tests/app/section-actions.test.ts`
Expected: FAIL (`setProgressAction` is not exported).

- [ ] **Step 20: Replace `src/app/sections/actions.ts` with**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/session'
import { setProgress } from '@/lib/progress'
import { createPost, deletePost } from '@/lib/posts'

export async function setProgressAction(bookId: string, chaptersFinished: number): Promise<number> {
  const user = await requireUser()
  const saved = await setProgress(user.id, bookId, chaptersFinished)
  revalidatePath('/')
  revalidatePath('/past-books')
  return saved
}

export async function createPostAction(sectionId: string, formData: FormData) {
  const user = await requireUser()
  const body = String(formData.get('body') ?? '')
  const parentPostId = formData.get('parentPostId')
  await createPost(sectionId, user.id, body, parentPostId ? String(parentPostId) : undefined)
  revalidatePath(`/sections/${sectionId}`)
}

export async function deletePostAction(sectionId: string, postId: string) {
  const user = await requireUser()
  await deletePost(postId, user.id)
  revalidatePath(`/sections/${sectionId}`)
  revalidatePath('/')
}
```

- [ ] **Step 21: Run test to verify it passes**

Run: `npm test -- tests/app/section-actions.test.ts`
Expected: PASS.

- [ ] **Step 22: Update `tests/app/admin-actions.test.ts`**

Run:

```bash
sed -i "s/createBook({ title: 'Dune', author: 'Frank Herbert' })/createBook({ title: 'Dune', author: 'Frank Herbert', totalChapters: 30 })/g; s/addSection(book.id, 'Chapters 1-5')/addSection(book.id, { startChapter: 1, endChapter: 5 })/g" tests/app/admin-actions.test.ts
```

Make these edits in that file:

1. Change the import line to:

```ts
import { createBookAction, addAllowedEmailAction, addSectionAction, updateSectionAction, updateTotalChaptersAction, deleteSectionAction, deleteBookAction, uploadCoverAction, removeCoverAction } from '@/app/admin/actions'
```

2. Add `await prisma.readingProgress.deleteMany()` as the first line of the top-level `beforeEach`.

3. In `it('creates a book for an admin', ...)`, add `fd.set('totalChapters', '30')` after `fd.set('author', 'Frank Herbert')`, and add after the existing expect: `expect(book.totalChapters).toBe(30)`.

4. Replace the three tests `rejects updateSectionLabelAction for a non-admin`, `renames a section for an admin` and `rejects a label-less rename` with:

```ts
  it('rejects a book without a valid total chapters', async () => {
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
    for (const bad of ['', 'abc', '0', '2.5']) {
      const fd = new FormData()
      fd.set('title', 'Dune')
      fd.set('author', 'Frank Herbert')
      fd.set('totalChapters', bad)
      await expect(createBookAction(fd)).rejects.toThrow('Total chapters')
    }
    expect(await prisma.book.count()).toBe(0)
  })

  function sectionForm(fields: Record<string, string>) {
    const fd = new FormData()
    for (const [key, value] of Object.entries(fields)) fd.set(key, value)
    return fd
  }

  it('rejects addSectionAction for a non-admin', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Forbidden: admin only'))
    await expect(
      addSectionAction(sectionForm({ bookId: 'whatever', startChapter: '1', endChapter: '5' }))
    ).rejects.toThrow('Forbidden')
  })

  it('adds a section with an optional title for an admin', async () => {
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert', totalChapters: 30 })

    await addSectionAction(sectionForm({ bookId: book.id, startChapter: '6', endChapter: '10', title: ' Lowood ' }))
    await addSectionAction(sectionForm({ bookId: book.id, startChapter: '11', endChapter: '15', title: '' }))

    const sections = await prisma.section.findMany({ where: { bookId: book.id }, orderBy: { order: 'asc' } })
    expect(sections.map((s) => [s.startChapter, s.endChapter, s.title])).toEqual([
      [6, 10, 'Lowood'],
      [11, 15, null],
    ])
  })

  it('rejects a section whose numbers are missing, backwards, or past the total', async () => {
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert', totalChapters: 30 })

    await expect(
      addSectionAction(sectionForm({ bookId: book.id, startChapter: '', endChapter: '5' }))
    ).rejects.toThrow('Start chapter')
    await expect(
      addSectionAction(sectionForm({ bookId: book.id, startChapter: '10', endChapter: '6' }))
    ).rejects.toThrow('before the start')
    await expect(
      addSectionAction(sectionForm({ bookId: book.id, startChapter: '28', endChapter: '31' }))
    ).rejects.toThrow('past the book')
    expect(await prisma.section.count()).toBe(0)
  })

  it('rejects updateSectionAction for a non-admin', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Forbidden: admin only'))
    await expect(
      updateSectionAction(sectionForm({ sectionId: 'whatever', startChapter: '1', endChapter: '5' }))
    ).rejects.toThrow('Forbidden')
  })

  it("updates a section's range and title for an admin", async () => {
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert', totalChapters: 30 })
    const section = await addSection(book.id, { startChapter: 1, endChapter: 5 })

    await updateSectionAction(
      sectionForm({ sectionId: section.id, startChapter: '1', endChapter: '6', title: 'Gateshead' })
    )

    const updated = await prisma.section.findUniqueOrThrow({ where: { id: section.id } })
    expect(updated).toMatchObject({ startChapter: 1, endChapter: 6, title: 'Gateshead' })
  })

  it('requires a sectionId to update', async () => {
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
    await expect(
      updateSectionAction(sectionForm({ sectionId: '', startChapter: '1', endChapter: '5' }))
    ).rejects.toThrow('required')
  })

  it('rejects updateTotalChaptersAction for a non-admin, and updates for an admin', async () => {
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert', totalChapters: 30 })
    const form = sectionForm({ bookId: book.id, totalChapters: '40' })

    mockRequireAdmin.mockRejectedValue(new Error('Forbidden: admin only'))
    await expect(updateTotalChaptersAction(form)).rejects.toThrow('Forbidden')
    expect((await prisma.book.findUniqueOrThrow({ where: { id: book.id } })).totalChapters).toBe(30)

    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
    await updateTotalChaptersAction(form)
    expect((await prisma.book.findUniqueOrThrow({ where: { id: book.id } })).totalChapters).toBe(40)
  })
```

- [ ] **Step 23: Run test to verify it fails**

Run: `npm test -- tests/app/admin-actions.test.ts`
Expected: FAIL (`addSectionAction` takes a label, `updateSectionAction` / `updateTotalChaptersAction` don't exist).

- [ ] **Step 24: Edit `src/app/admin/actions.ts`**

Replace the import line for `@/lib/books` with:

```ts
import { createBook, addSection, setBookStatus, updateSection, updateTotalChapters, deleteSection, deleteBook } from '@/lib/books'
```

Add this helper above `createBookAction`:

```ts
// An empty or non-numeric field becomes NaN, which the lib validators reject with a message.
function parseWholeNumber(raw: FormDataEntryValue | null): number {
  const text = String(raw ?? '').trim()
  return text === '' ? NaN : Number(text)
}

function revalidateBookPages() {
  revalidatePath('/admin')
  revalidatePath('/')
  revalidatePath('/past-books')
}
```

Replace `createBookAction`, `addSectionAction` and `updateSectionLabelAction` with these four functions (leave every other action as it is):

```ts
export async function createBookAction(formData: FormData) {
  await requireAdmin()
  const title = String(formData.get('title') ?? '').trim()
  const author = String(formData.get('author') ?? '').trim()
  if (!title || !author) {
    throw new Error('Title and author are required')
  }
  const book = await createBook({ title, author, totalChapters: parseWholeNumber(formData.get('totalChapters')) })
  revalidatePath('/admin')
  return book
}

export async function addSectionAction(formData: FormData) {
  await requireAdmin()
  const bookId = String(formData.get('bookId') ?? '')
  if (!bookId) {
    throw new Error('bookId is required')
  }
  await addSection(bookId, {
    startChapter: parseWholeNumber(formData.get('startChapter')),
    endChapter: parseWholeNumber(formData.get('endChapter')),
    title: String(formData.get('title') ?? ''),
  })
  revalidateBookPages()
}

export async function updateSectionAction(formData: FormData) {
  await requireAdmin()
  const sectionId = String(formData.get('sectionId') ?? '')
  if (!sectionId) {
    throw new Error('sectionId is required')
  }
  await updateSection(sectionId, {
    startChapter: parseWholeNumber(formData.get('startChapter')),
    endChapter: parseWholeNumber(formData.get('endChapter')),
    title: String(formData.get('title') ?? ''),
  })
  revalidateBookPages()
}

export async function updateTotalChaptersAction(formData: FormData) {
  await requireAdmin()
  const bookId = String(formData.get('bookId') ?? '')
  if (!bookId) {
    throw new Error('bookId is required')
  }
  await updateTotalChapters(bookId, parseWholeNumber(formData.get('totalChapters')))
  revalidateBookPages()
}
```

- [ ] **Step 25: Run the whole suite**

Run: `npm test`
Expected: PASS for every test file.

- [ ] **Step 26: Confirm the only type errors left are in UI files**

Run: `npx tsc --noEmit 2>&1 | grep -v "^ " | cut -d'(' -f1 | sort -u`
Expected: only these four files are listed (Tasks 4 and 5 fix them): `src/app/admin/page.tsx`, `src/app/page.tsx`, `src/app/past-books/page.tsx`, `src/app/sections/[sectionId]/page.tsx`. Any other file listed means a mistake in this task.

- [ ] **Step 27: Commit**

```bash
git add prisma/schema.prisma src/lib/progress.ts src/lib/books.ts src/lib/sections.ts src/app/sections/actions.ts src/app/admin/actions.ts tests/lib tests/app
git commit -m "feat: chapter ranges, reading progress and stepper-driven unlocking in the backend"
```

---

### Task 4: Player UI (stepper, thread rows, main and past-books pages)

Component code has no unit tests in this repo; verification is the type check, lint, and a manual check in the browser (Google sign-in can't be scripted).

**Files:**
- Create: `src/components/ProgressStepper.tsx`, `src/components/SectionRow.tsx`
- Modify: `src/app/page.tsx`, `src/app/past-books/page.tsx`, `src/app/sections/[sectionId]/page.tsx`
- Delete: `src/components/JoinSectionButton.tsx`

**Interfaces:**
- Consumes (Tasks 1 and 3): `segmentStates`, `clampProgress`, `chapterRangeName`, `sectionDisplayName`, `getProgress`, `getSectionsForViewer`, `SectionSummary`, `setProgressAction`.
- Produces: `<ProgressStepper bookId totalChapters initialFinished sections saveProgress />`, `<SectionRow section />`.

- [ ] **Step 1: Create `src/components/ProgressStepper.tsx`**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { Box, Flex, HStack, IconButton, Text } from '@chakra-ui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMinus, faPlus } from '@fortawesome/free-solid-svg-icons'
import { clampProgress, segmentStates } from '@/lib/chapters'

const SEGMENT_COLORS = { done: 'antiqueGold', current: 'progressCurrent', todo: 'progressTodo' } as const

export function ProgressStepper({
  bookId,
  totalChapters,
  initialFinished,
  sections,
  saveProgress,
}: {
  bookId: string
  totalChapters: number
  initialFinished: number
  sections: { startChapter: number; endChapter: number }[]
  saveProgress: (bookId: string, chaptersFinished: number) => Promise<number>
}) {
  const [finished, setFinished] = useState(initialFinished)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function step(delta: number) {
    const next = clampProgress(finished + delta, totalChapters)
    if (next === finished) return
    const previous = finished
    setFinished(next)
    setError(null)
    startTransition(async () => {
      try {
        setFinished(await saveProgress(bookId, next))
      } catch {
        setFinished(previous)
        setError('Could not save your place. Try again.')
      }
    })
  }

  const buttonProps = {
    variant: 'outline',
    borderRadius: 'full',
    borderColor: 'antiqueGold',
    color: 'antiqueGold',
    bg: 'transparent',
    _hover: { bg: 'mulberry' },
  } as const

  return (
    <Box bg="velvet" color="parchment" borderWidth="1px" borderColor="border" borderRadius="xl" p={5}>
      <Text fontSize="xs" letterSpacing="0.14em" textTransform="uppercase" color="antiqueGold">
        Your place in the book
      </Text>
      <Flex align="center" justify="space-between" mt={4}>
        <IconButton
          aria-label="One chapter fewer"
          icon={<FontAwesomeIcon icon={faMinus} />}
          onClick={() => step(-1)}
          isDisabled={pending || finished <= 0}
          {...buttonProps}
        />
        <Box textAlign="center">
          <Text fontFamily="heading" fontWeight="bold" fontSize="4xl" lineHeight="1" aria-live="polite">
            {finished}
          </Text>
          <Text fontSize="sm" color="mist">
            chapters finished, of {totalChapters}
          </Text>
        </Box>
        <IconButton
          aria-label="One chapter more"
          icon={<FontAwesomeIcon icon={faPlus} />}
          onClick={() => step(1)}
          isDisabled={pending || finished >= totalChapters}
          {...buttonProps}
        />
      </Flex>
      <HStack spacing={1} mt={4} aria-hidden>
        {segmentStates(sections, finished).map((state, index) => (
          <Box key={index} flex="1" h="6px" borderRadius="full" bg={SEGMENT_COLORS[state]} />
        ))}
      </HStack>
      {error && (
        <Text role="alert" mt={2} fontSize="sm" color="dustyRose">
          {error}
        </Text>
      )}
    </Box>
  )
}
```

- [ ] **Step 2: Create `src/components/SectionRow.tsx`**

```tsx
import NextLink from 'next/link'
import { Link, ListItem, Text } from '@chakra-ui/react'
import { chapterRangeName, sectionDisplayName } from '@/lib/chapters'
import type { SectionSummary } from '@/lib/sections'
import { SectionActivity } from '@/components/SectionActivity'

export function SectionRow({ section }: { section: SectionSummary }) {
  if (section.status === 'locked') {
    const toGo = section.chaptersToGo
    return (
      <ListItem borderWidth="1px" borderStyle="dashed" borderColor="brand.500" borderRadius="md" p={3}>
        <Text color="brand.700" fontWeight={500} fontSize="lg">
          {chapterRangeName(section.startChapter, section.endChapter)} · Sealed
        </Text>
        <Text fontSize="sm" color="gray.600">
          Opens after chapter {section.endChapter}, {toGo} chapter{toGo === 1 ? '' : 's'} to go
        </Text>
      </ListItem>
    )
  }

  return (
    <ListItem borderWidth="1px" borderColor="brand.500" bg="brand.50" borderRadius="md" p={3}>
      <Link as={NextLink} href={`/sections/${section.id}`} color="brand.700" fontWeight={500} fontSize="lg">
        Discuss {sectionDisplayName(section)}
      </Link>
      <SectionActivity postCount={section.postCount} lastPostAt={section.lastPostAt} />
    </ListItem>
  )
}
```

- [ ] **Step 3: Replace `src/app/page.tsx` with**

```tsx
import { Box, Flex, Heading, Image, List, Text } from '@chakra-ui/react'
import { requireUser } from '@/lib/session'
import { listBooks } from '@/lib/books'
import { getSectionsForViewer } from '@/lib/sections'
import { getProgress } from '@/lib/progress'
import { DiscussionPromptCard } from '@/components/DiscussionPromptCard'
import { ProgressStepper } from '@/components/ProgressStepper'
import { SectionRow } from '@/components/SectionRow'
import { setProgressAction } from './sections/actions'

export default async function HomePage() {
  const user = await requireUser()
  const [book] = await listBooks('current')

  if (!book) {
    return (
      <Box p={8}>
        <Text>No current book yet — check back soon.</Text>
      </Box>
    )
  }

  const [sections, finished] = await Promise.all([
    getSectionsForViewer(book.id, user.id),
    getProgress(user.id, book.id),
  ])

  return (
    <Flex p={8} gap={8} direction={{ base: 'column', lg: 'row' }} align="flex-start">
      <Box flex="1" minW={0} w="100%">
          <Flex gap={5} align="flex-start" mb={4}>
            {book.cover && (
              <Image
                src={`/books/${book.id}/cover?v=${book.cover.updatedAt.getTime()}`}
                alt={`Cover of ${book.title}`}
                w={{ base: '80px', md: '120px' }}
                flexShrink={0}
                borderRadius="md"
                boxShadow="md"
              />
            )}
            <Box>
              <Heading size="lg" color="brand.900" mb={4}>
                {book.title}{' '}
                <Text as="span" color="brand.300" fontWeight="normal">
                  by {book.author}
                </Text>
              </Heading>
              <Text color="brand.700">
                {sections.length === 0
                  ? "Discussion threads for this book will open up soon. Start reading, and check back shortly to join the conversation!"
                  : "No spoilers here! Every discussion thread starts sealed. As you read, move your place in the book forward, and each thread opens once you finish its last chapter. We've been waiting to hear what you think!"}
              </Text>
            </Box>
          </Flex>
          <List spacing={2}>
            {sections.map((section) => (
              <SectionRow key={section.id} section={section} />
            ))}
          </List>
      </Box>
      <Box w={{ base: '100%', lg: '22rem' }} flexShrink={0}>
        <Box mb={4}>
          <ProgressStepper
            bookId={book.id}
            totalChapters={book.totalChapters}
            initialFinished={finished}
            sections={sections}
            saveProgress={setProgressAction}
          />
        </Box>
        <DiscussionPromptCard />
      </Box>
    </Flex>
  )
}
```

- [ ] **Step 4: Replace `src/app/past-books/page.tsx` with**

```tsx
import { Box, Heading, List, Text, VStack } from '@chakra-ui/react'
import { requireUser } from '@/lib/session'
import { listBooks } from '@/lib/books'
import { getSectionsForViewer } from '@/lib/sections'
import { getProgress } from '@/lib/progress'
import { ProgressStepper } from '@/components/ProgressStepper'
import { SectionRow } from '@/components/SectionRow'
import { setProgressAction } from '@/app/sections/actions'

export default async function PastBooksPage() {
  const user = await requireUser()
  const books = await listBooks('past')

  return (
    <VStack align="stretch" p={8} spacing={8}>
      <Heading size="lg" color="brand.900">
        Past books
      </Heading>
      {books.length === 0 && <Text color="gray.500">No past books yet.</Text>}
      {await Promise.all(
        books.map(async (book) => {
          const [sections, finished] = await Promise.all([
            getSectionsForViewer(book.id, user.id),
            getProgress(user.id, book.id),
          ])
          return (
            <Box key={book.id}>
              <Heading size="md">
                {book.title}{' '}
                <Text as="span" color="gray.500" fontWeight="normal">
                  by {book.author}
                </Text>
              </Heading>
              <Box mt={3} maxW="22rem">
                <ProgressStepper
                  bookId={book.id}
                  totalChapters={book.totalChapters}
                  initialFinished={finished}
                  sections={sections}
                  saveProgress={setProgressAction}
                />
              </Box>
              <List spacing={2} mt={3}>
                {sections.map((section) => (
                  <SectionRow key={section.id} section={section} />
                ))}
              </List>
            </Box>
          )
        })
      )}
    </VStack>
  )
}
```

- [ ] **Step 5: Fix the thread page heading**

In `src/app/sections/[sectionId]/page.tsx`, change `{thread.label}` to `{thread.name}`.

- [ ] **Step 6: Delete the unused join button**

Run: `git rm src/components/JoinSectionButton.tsx`

- [ ] **Step 7: Verify types and lint for the player pages**

Run: `npx tsc --noEmit 2>&1 | grep -v "^ " | cut -d'(' -f1 | sort -u`
Expected: only `src/app/admin/page.tsx` is listed (Task 5 fixes it).

Run: `npx next lint`
Expected: no errors in the files touched by this task.

- [ ] **Step 8: Manual check (needs a browser and a Google sign-in, so ask the user to do it)**

With `npm run dev` running and the dev DB already migrated (Task 6), the user checks on `/`:
1. The "Your place in the book" card shows 0 of N, with all progress segments dark.
2. Pressing + up to a thread's last chapter opens that thread (its row becomes a link) and fills its segment gold.
3. Pressing − afterwards leaves the thread open.
4. A sealed row shows only "Chapters X to Y · Sealed" and "Opens after chapter Y, N chapters to go", with no title.

- [ ] **Step 9: Commit**

```bash
git add src/components/ProgressStepper.tsx src/components/SectionRow.tsx src/app/page.tsx src/app/past-books/page.tsx "src/app/sections/[sectionId]/page.tsx"
git commit -m "feat: progress stepper and sealed/open thread rows replace the join button"
```

(`git rm` already staged the deletion of `JoinSectionButton.tsx`, so it is included in this commit.)

---

### Task 5: Admin UI

**Files:**
- Modify: `src/app/admin/page.tsx`

**Interfaces:**
- Consumes (Tasks 1 and 3): `createBookAction`, `addSectionAction`, `updateSectionAction`, `updateTotalChaptersAction`, `sectionDisplayName`, and the existing admin actions.

- [ ] **Step 1: Replace `src/app/admin/page.tsx` with**

```tsx
import { Box, Button, Heading, HStack, Input, Stack, Text, VStack } from '@chakra-ui/react'
import { requireAdmin } from '@/lib/session'
import { listBooks } from '@/lib/books'
import { sectionDisplayName } from '@/lib/chapters'
import { CoverUpload } from '@/components/CoverUpload'
import { DeleteBookButton } from '@/components/DeleteBookButton'
import { DeleteSectionButton } from '@/components/DeleteSectionButton'
import {
  createBookAction,
  addSectionAction,
  setBookStatusAction,
  updateSectionAction,
  updateTotalChaptersAction,
  deleteSectionAction,
  deleteBookAction,
  uploadCoverAction,
  removeCoverAction,
} from './actions'

export default async function AdminPage() {
  await requireAdmin()
  const books = await listBooks()

  return (
    <VStack align="stretch" p={8} spacing={8}>
      <Heading size="lg" color="brand.900">
        Admin
      </Heading>

      <Box>
        <Heading size="md" mb={2}>
          New book
        </Heading>
        <form
          action={async (formData: FormData) => {
            'use server'
            await createBookAction(formData)
          }}
        >
          <HStack>
            <Input name="title" placeholder="Title" required />
            <Input name="author" placeholder="Author" required />
            <Input
              name="totalChapters"
              type="number"
              min={1}
              placeholder="Chapters"
              aria-label="Total chapters"
              required
              w="120px"
              flexShrink={0}
            />
            <Button
              type="submit"
              bg="brand.700"
              color="white"
              _hover={{ bg: 'brand.900' }}
              w="200px"
              flexShrink={0}
            >
              Add book
            </Button>
          </HStack>
        </form>
      </Box>

      <VStack align="stretch" spacing={6}>
        {books.map((book) => (
          <Box key={book.id} borderWidth="1px" borderColor="#e7b7a6" borderRadius="md" p={4}>
            <HStack justify="space-between">
              <Heading size="sm">
                {book.title} — {book.author} ({book.status})
              </Heading>
              <HStack spacing={4}>
                <form
                  action={async () => {
                    'use server'
                    await setBookStatusAction(book.id, book.status === 'current' ? 'past' : 'current')
                  }}
                >
                  <Button type="submit" size="sm" variant="link" color="brand.700">
                    Mark as {book.status === 'current' ? 'past' : 'current'}
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
            </HStack>
            <form
              action={async (formData: FormData) => {
                'use server'
                await updateTotalChaptersAction(formData)
              }}
            >
              <input type="hidden" name="bookId" value={book.id} />
              <HStack mt={3}>
                <Text fontSize="sm" color="gray.600">
                  Total chapters
                </Text>
                <Input
                  name="totalChapters"
                  type="number"
                  min={1}
                  defaultValue={book.totalChapters}
                  aria-label="Total chapters"
                  size="sm"
                  w="90px"
                  required
                />
                <Button type="submit" size="sm" variant="link" color="brand.700">
                  Save
                </Button>
              </HStack>
            </form>
            <CoverUpload
              bookId={book.id}
              title={book.title}
              coverVersion={book.cover?.updatedAt.getTime() ?? null}
              uploadAction={uploadCoverAction}
              removeAction={async () => {
                'use server'
                await removeCoverAction(book.id)
              }}
            />
            <Stack spacing="1em" mt="1em">
              {book.sections.map((s) => (
                <HStack key={s.id} spacing={2}>
                  <Text fontSize="sm" color="gray.600" flexShrink={0}>
                    {s.order}.
                  </Text>
                  <Box flex="1">
                    <form
                      action={async (formData: FormData) => {
                        'use server'
                        await updateSectionAction(formData)
                      }}
                    >
                      <input type="hidden" name="sectionId" value={s.id} />
                      <HStack>
                        <Input
                          name="startChapter"
                          type="number"
                          min={1}
                          defaultValue={s.startChapter}
                          aria-label="Start chapter"
                          size="sm"
                          w="80px"
                          required
                        />
                        <Text fontSize="sm">to</Text>
                        <Input
                          name="endChapter"
                          type="number"
                          min={1}
                          defaultValue={s.endChapter}
                          aria-label="End chapter"
                          size="sm"
                          w="80px"
                          required
                        />
                        <Input
                          name="title"
                          defaultValue={s.title ?? ''}
                          placeholder="Title (optional)"
                          aria-label="Title"
                          size="sm"
                          flex="1"
                          maxW="40%"
                        />
                        <Button type="submit" size="sm" variant="link" color="brand.700" flexShrink={0}>
                          Save
                        </Button>
                      </HStack>
                    </form>
                  </Box>
                  <DeleteSectionButton
                    label={sectionDisplayName(s)}
                    postCount={s._count.posts}
                    action={async () => {
                      'use server'
                      await deleteSectionAction(s.id)
                    }}
                  />
                </HStack>
              ))}
            </Stack>
            <form action={addSectionAction}>
              <input type="hidden" name="bookId" value={book.id} />
              <HStack mt="2em">
                <Input
                  name="startChapter"
                  type="number"
                  min={1}
                  placeholder="From"
                  aria-label="Start chapter"
                  required
                  w="90px"
                  flexShrink={0}
                />
                <Text>to</Text>
                <Input
                  name="endChapter"
                  type="number"
                  min={1}
                  placeholder="To"
                  aria-label="End chapter"
                  required
                  w="90px"
                  flexShrink={0}
                />
                <Input name="title" placeholder="Title (optional), e.g. Lowood" aria-label="Title" flex="1" maxW="40%" />
                <Button type="submit" bg="brand.700" color="white" _hover={{ bg: 'brand.900' }} flexShrink={0}>
                  Add section
                </Button>
              </HStack>
            </form>
          </Box>
        ))}
      </VStack>
    </VStack>
  )
}
```

- [ ] **Step 2: Verify types and lint**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx next lint`
Expected: no errors.

- [ ] **Step 3: Manual check (ask the user, as in Task 4 Step 8)**

On `/admin` as the admin: add a book with 38 chapters; add "1 to 5 · Gateshead"; try adding "6 to 40" (rejected with "past the book's 38 chapters"); change a section's end chapter and save; change the book's total to 4 (rejected while a thread ends at 5).

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat: admin forms for total chapters and chapter-range threads"
```

---

### Task 6: Migrate the development database and verify end to end

**Files:**
- No source changes. Operates on `prisma/dev.db` (git-ignored) after trying the migration on a scratch copy.

- [ ] **Step 1: Rehearse on a copy**

```bash
cp prisma/dev.db prisma/dev-copy.db
DATABASE_URL="file:$PWD/prisma/dev-copy.db" npm run db:backfill-chapters
```

Expected output: `Backfilled 7 section(s) across 1 book(s).` (the dev data has The Stand with 7 sections).

- [ ] **Step 2: Push the new schema onto the copy**

```bash
DATABASE_URL="file:$PWD/prisma/dev-copy.db" npx prisma db push --accept-data-loss
```

Expected: "Your database is now in sync with your Prisma schema", with a warning that the `label` column will be dropped.

- [ ] **Step 3: Check the copy**

```bash
python3 - <<'EOF'
import sqlite3
c = sqlite3.connect('file:prisma/dev-copy.db?mode=ro', uri=True)
print('totals', c.execute('select title, totalChapters from Book').fetchall())
for r in c.execute('select "order", startChapter, endChapter, title from Section order by "order"'): print(r)
print('section columns', [r[1] for r in c.execute('pragma table_info(Section)')])
print('tables', [r[0] for r in c.execute("select name from sqlite_master where type='table' and name='ReadingProgress'")])
print('posts', c.execute('select count(*) from Post').fetchone()[0], 'memberships', c.execute('select count(*) from ThreadMembership').fetchone()[0])
EOF
```

Expected: `totals [('The Stand', 75)]`; sections `(1, 1, 10, None)` through `(7, 61, 75, None)`; section columns without `label` and with `startChapter`, `endChapter`, `title`; `tables ['ReadingProgress']`; `posts 4 memberships 2`.

If anything differs, stop and fix the script before touching the real database.

- [ ] **Step 4: Remove the copy**

Run: `rm prisma/dev-copy.db`

- [ ] **Step 5: Migrate the real dev database**

Stop `npm run dev` first (the push regenerates the client). Then:

```bash
npm run db:backfill-chapters
npx prisma db push --accept-data-loss
```

Expected: the same outputs as on the copy. Repeating `npm run db:backfill-chapters` afterwards prints `Section.label is already gone; nothing to do.`

- [ ] **Step 6: Full verification**

```bash
npm test
npx tsc --noEmit
npx next lint
```

Expected: all tests pass; no type errors; no lint errors.

- [ ] **Step 7: Walk through the app (ask the user)**

Start `npm run dev` and repeat the checks from Task 4 Step 8 and Task 5 Step 3. Also confirm the two existing memberships still show their threads as open for the user who had joined them, and that a thread opened by URL while sealed returns the 404 page.

- [ ] **Step 8: Final state check**

Run: `git status --short`
Expected: only the earlier uncommitted font/theme/avatar edits (if the user has not committed them yet) and the untracked `bookclub concept.png`. Nothing from this plan is left uncommitted.
