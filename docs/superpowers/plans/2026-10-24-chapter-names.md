# Chapter Names Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin optionally name a book's chapters, and show those names on the progress card, sealed thread
cards and the safe-ground pill.

**Architecture:** A new `ChapterName` table keyed by `(bookId, number)`. Server code in `src/lib/chapter-names.ts`
reads and replaces a book's names. Pure helpers live in `src/lib/chapters.ts`, so client components can use them. Reader
data shapes gain a `chapterNames` map or an `endChapterName`. A new collapsible admin card edits the names with one row
per chapter.

**Tech Stack:** Next.js 14 App Router (server actions), Prisma 5 on SQLite (`prisma db push`), Chakra UI, Vitest (node
environment, real test DB).

**Spec:** `docs/superpowers/specs/2026-10-24-chapter-names-design.md`

## Global Constraints

- A book with no chapter names renders the reader screens exactly as today.
- Names are labels only. `chaptersFinished`, unlocking and section ranges stay number-based.
- `CHAPTER_NAME_MAX = 100` characters after trimming. Empty after trimming means unnamed, so no row is stored.
- The chapter number is 1-based, a whole number in `1..totalChapters`.
- Sealed summaries gain only `endChapterName`. The thread title and posts never reach a sealed card.
- Chapter names aren't part of setup completion (`CompletionChips` is unchanged).
- Copy: `Last finished · Chapter N`, `Not started yet`, `Opens after chapter N · <name>, K chapters to go`,
  `Safe ground: nothing past chapter N · <name>`, `Total chapters cannot be less than N, the last chapter with a name`.
  Names render in italics.

## Review Focus

1. **Pasting a whole table of contents into row 1 of a 32-chapter book that has 40 lines** should fill 1–32, report "8
   lines didn't fit", and enable Save. The last part needs a synthetic `input` event, because `AdminForm` re-checks
   only on `onInput`. Covered by the `fillDown` tests in Task 1; Task 5 Step 3 dispatches the event.
2. **Lowering the chapter count below a named chapter** is refused both on the client (Save disabled, message shown)
   and on the server. Covered in Task 2.
3. **Deleting a book that has chapter names** shouldn't hit a foreign-key failure. Covered by `onDelete: Cascade` and a
   test in Task 1.
4. **A name that's only whitespace, or has padding** is stored trimmed, or not stored at all. Covered in Task 1.
5. **The last finished chapter has no name, but others do** should show only `Last finished · Chapter 7`, with no stray
   `·`. Task 4 Step 1 pins this through `lastFinishedLabel`.

---

### Task 1: Data model and chapter-name storage

**Files:**
- Modify: `prisma/schema.prisma` (add the `ChapterName` model, plus `Book.chapterNames`)
- Modify: `src/lib/limits.ts`
- Create: `src/lib/chapter-names.ts`
- Modify: `src/lib/chapters.ts` (add the pure `fillDown`)
- Test: `tests/lib/chapter-names.test.ts`, `tests/lib/chapters.test.ts`, `tests/lib/limits.test.ts`

**Interfaces:**
- Produces:
  - `CHAPTER_NAME_MAX = 100` and `validateChapterName(name: string): string | null` in `src/lib/limits.ts`. The
    message is `Chapter names can be at most 100 characters`.
  - `getChapterNames(bookId: string): Promise<Record<number, string>>`
  - `setChapterNames(bookId: string, names: Record<number, string>): Promise<void>`. It throws `ValidationError`.
  - `highestNamedChapter(bookId: string): Promise<number>`. It returns 0 when there are no names.
  - `fillDown(values: string[], startIndex: number, pasted: string): { values: string[]; dropped: number }`, where
    `values[0]` is chapter 1.

- [ ] **Step 1: Add the schema**

```prisma
model ChapterName {
  bookId String
  number Int // 1-based chapter number
  name   String

  book Book @relation(fields: [bookId], references: [id], onDelete: Cascade)

  @@id([bookId, number])
}
```

Add `chapterNames ChapterName[]` to `Book`. The cascade replaces an explicit delete in `deleteBook`. It also keeps the
existing `prisma.book.deleteMany()` test cleanups working. Run `npx prisma db push` and `npx prisma generate`.

- [ ] **Step 2: Write failing tests**

`tests/lib/chapter-names.test.ts`: the book has `totalChapters: 10`. `beforeEach` clears `chapterName` and then the
tables `books.test.ts` clears.
- `saves and reads back names by number`: `setChapterNames(id, { 1: 'Arrivals', 7: 'B&B' })`, then
  `getChapterNames(id)` gives `{ 1: 'Arrivals', 7: 'B&B' }`.
- `trims names and drops blank ones`: `{ 1: '  B&B  ', 2: '   ', 3: '' }` gives `{ 1: 'B&B' }`.
- `replaces earlier names`: save `{ 1: 'A', 2: 'B' }`, then save `{ 2: 'C' }`, which gives `{ 2: 'C' }`.
- `rejects a name over 100 characters`: `'x'.repeat(101)` rejects with `ValidationError`, and the earlier names are
  unchanged. `'x'.repeat(100)` is accepted.
- `rejects chapter numbers outside the book`: `{ 0: 'A' }`, `{ 11: 'A' }` and `{ 1.5: 'A' }` each reject with
  `ValidationError`.
- `highestNamedChapter`: it returns 0 with no names, and 7 after saving `{ 2: 'A', 7: 'B' }`.
- `deleteBook removes chapter names`: save names, call `deleteBook(id)`, then `prisma.chapterName.count()` is 0.

`tests/lib/chapters.test.ts`, `fillDown`:
- `fills the row and the rows below, skipping blank lines`: `fillDown(['', '', '', ''], 1, 'One\n\n Two \r\nThree')`
  gives `{ values: ['', 'One', 'Two', 'Three'], dropped: 0 }`.
- `drops lines past the last chapter`: `fillDown(['', ''], 0, 'a\nb\nc\nd')` gives
  `{ values: ['a', 'b'], dropped: 2 }`.
- `overwrites existing names it reaches and leaves the others`: `fillDown(['x', 'y', 'z'], 1, 'b')` gives
  `{ values: ['x', 'b', 'z'], dropped: 0 }`.

`tests/lib/limits.test.ts`: `validateChapterName('x'.repeat(100))` is `null`. `validateChapterName('x'.repeat(101))`
returns the message.

- [ ] **Step 3: Run them and confirm they fail**

Run `npm test -- tests/lib/chapter-names.test.ts tests/lib/chapters.test.ts tests/lib/limits.test.ts`. Expected: FAIL
on the missing exports.

- [ ] **Step 4: Implement**

- `setChapterNames` loads the book (`findUniqueOrThrow`) and validates every entry: the number with
  `Number.isInteger(n) && n >= 1 && n <= totalChapters`, or else
  `ValidationError('Chapter numbers must be from 1 to <total>')`, and the trimmed name with `validateChapterName`.
  Then, in a `$transaction`, it runs `deleteMany({ where: { bookId } })` and `createMany` for the non-blank names.
- `fillDown` splits on `/\r?\n/`, trims, and drops empty lines. It writes from `startIndex` onward and counts the
  overflow.

- [ ] **Step 5: Run the tests and confirm they pass.** Then run the full `npm test` and confirm it is green.

- [ ] **Step 6: Commit** with `feat: store optional chapter names per book`

---

### Task 2: Chapter count can't drop below a named chapter

**Files:**
- Modify: `src/lib/books.ts` (`updateTotalChapters`, and `listBooks` includes `chapterNames`)
- Modify: `src/lib/chapters.ts` (`FormRule` `total` and `validateFormValues`)
- Modify: `src/components/BookSetup.tsx`, `src/components/BookSetupHeader.tsx`
- Test: `tests/lib/books.test.ts`, `tests/lib/chapters.test.ts`

**Interfaces:**
- Consumes: `highestNamedChapter`, `setChapterNames` (Task 1).
- Produces:
  - `FormRule` `{ kind: 'total'; minTotal: number; minNamed?: number }`.
  - `listBooks()` rows carry `chapterNames: { number: number; name: string }[]`, ordered by `number`. `AdminBook`
    therefore has it too.

- [ ] **Step 1: Write failing tests**
- `books.test.ts`, `refuses a total below the last named chapter`: `newBook(30)`, then `setChapterNames(id, { 24: 'X' })`.
  `updateTotalChapters(id, 20)` rejects with `'Total chapters cannot be less than 24, the last chapter with a name'`.
  After `setChapterNames(id, {})`, `updateTotalChapters(id, 20)` succeeds.
- `chapters.test.ts`: `validateFormValues({ kind: 'total', minTotal: 0, minNamed: 24 }, { totalChapters: '20' })`
  returns the same message. The `minNamed: 24` and `'24'` case returns `null`. The existing thread message still wins
  when `minTotal` is the one violated.

- [ ] **Step 2: Run the tests and confirm they fail.**

- [ ] **Step 3: Implement**

`updateTotalChapters` checks the thread rule first (unchanged), then `highestNamedChapter`. `validateFormValues` mirrors
that order. `listBooks` adds `chapterNames: { orderBy: { number: 'asc' } }`. `BookSetup` passes
`minNamed={Math.max(0, ...book.chapterNames.map((c) => c.number))}` to `BookSetupHeader`, which puts it into
`rule={{ kind: 'total', minTotal, minNamed }}`.

- [ ] **Step 4: Run `npm test` and confirm it is green. Run `npx tsc --noEmit` and confirm it is clean.**

- [ ] **Step 5: Commit** with `feat: chapter count can't drop below a named chapter`

---

### Task 3: Reader data carries chapter names

**Files:**
- Modify: `src/lib/sections.ts`, `src/lib/book-view.ts`
- Test: `tests/lib/sections.test.ts`, `tests/lib/book-view.test.ts`

**Interfaces:**
- Consumes: `getChapterNames` (Task 1).
- Produces:
  - The locked `SectionSummary` gains `endChapterName: string | null`.
  - The unlocked `ThreadResult` gains `endChapterName: string | null`.
  - `BookViewData.book.chapterNames: Record<number, string>`.

- [ ] **Step 1: Write failing tests**
- `sections.test.ts`: a sealed section ending at 15 with `setChapterNames(book, { 15: 'The Lighthouse' })` gives
  `endChapterName: 'The Lighthouse'`. Without names it gives `null`. Update the existing exact-shape sealed assertion to
  include `endChapterName: null`; it must still have no `title`.
- `sections.test.ts`, `getSectionThread` for an unlocked section ending at 7, with `{ 7: 'B&B' }`: it gives
  `endChapterName: 'B&B'`. Without names it gives `null`.
- `book-view.test.ts`: the existing `data?.book` `toEqual` gains `chapterNames: {}`. A new case with
  `{ 1: 'Arrivals' }` gives `chapterNames: { 1: 'Arrivals' }`.

- [ ] **Step 2: Run the tests and confirm they fail.**

- [ ] **Step 3: Implement**

Update the comment above `SectionSummary`: chapter names are table-of-contents info and not spoilers, and the title and
posts are still never exposed. `getSectionsForViewer` loads the names once per call with `getChapterNames`.
`getSectionThread` looks up only its end chapter
(`prisma.chapterName.findUnique({ where: { bookId_number: … } })`). `getBookView` adds `getChapterNames(bookId)` to
its `Promise.all`.

- [ ] **Step 4: Run `npm test` and confirm it is green. Run `npx tsc --noEmit` and confirm it is clean.**

- [ ] **Step 5: Commit** with `feat: reader views carry chapter names`

---

### Task 4: Reader UI shows chapter names

**Files:**
- Modify: `src/lib/chapters.ts` (add `lastFinishedLabel`)
- Modify: `src/components/ProgressStepper.tsx`, `src/components/BookPanel.tsx`, `src/components/ThreadCard.tsx`,
  `src/components/ThreadPane.tsx`
- Test: `tests/lib/chapters.test.ts`

**Interfaces:**
- Consumes: the Task 3 shapes.
- Produces: `lastFinishedLabel(finished: number, names: Record<number, string>): { caption: string; name: string | null } | null`.

- [ ] **Step 1: Write failing tests** for `lastFinishedLabel`
- `lastFinishedLabel(7, {})` gives `null`. There are no names on the book, so the card is unchanged.
- `lastFinishedLabel(7, { 7: 'B&B' })` gives `{ caption: 'Last finished · Chapter 7', name: 'B&B' }`.
- `lastFinishedLabel(7, { 1: 'Arrivals' })` gives `{ caption: 'Last finished · Chapter 7', name: null }`.
- `lastFinishedLabel(0, { 1: 'Arrivals' })` gives `{ caption: 'Not started yet', name: null }`.

- [ ] **Step 2: Run the tests and confirm they fail. Implement it. Run the tests and confirm they pass.**

- [ ] **Step 3: Update the components**

- `ProgressStepper` gets a new prop `chapterNames: Record<number, string>`. When `lastFinishedLabel(finished, …)` is
  non-null, it renders between the "Your place in the book" label and the −/+ `Flex`: the caption in `mist`,
  `fontSize="sm"`, and the name in `fontFamily="heading"`, `fontStyle="italic"`, `fontSize="xl"`, `color="parchment"`.
  Wrap both in a `Box` with `aria-live="polite"` and `textAlign="center"`. It reads the optimistic `finished`, so it
  updates on each tap.
- `BookPanel` passes `chapterNames={book.chapterNames}`.
- `ThreadCard`, locked branch: after `Opens after chapter {section.endChapter}`, when `endChapterName` is set, add
  ` · ` followed by an italic `<Text as="span" fontStyle="italic">`, then the existing `, {toGo} chapter…`.
- `ThreadPane`: `SafeGroundPill` takes `endChapterName: string | null` and appends the italic ` · <name>` the same way.

- [ ] **Step 4: Verify in the app**

Run `npm test` and `npx tsc --noEmit`. Then start the app (`npm run dev`) and look at a current book with no names: the
progress card, the sealed cards and the pill look as they do today. Add names through Prisma Studio or a script, then
check the "Last finished" line updates as you tap + and −, and check the sealed card and pill text against the mockups
in `.superpowers/brainstorm/537267-1792863122/content/`.

- [ ] **Step 5: Commit** with `feat: show chapter names on the progress card and thread cards`

---

### Task 5: Admin chapter names card

**Files:**
- Modify: `src/app/admin/actions.ts` (add `updateChapterNamesAction`)
- Modify: `src/lib/chapters.ts` (add the `{ kind: 'chapterNames' }` rule)
- Create: `src/components/ChapterNamesCard.tsx`
- Modify: `src/components/BookSetup.tsx`
- Test: `tests/app/admin-actions.test.ts`, `tests/lib/chapters.test.ts`

**Interfaces:**
- Consumes: `setChapterNames`, `validateChapterName`, `fillDown` (Task 1), and `AdminBook.chapterNames` (Task 2).
- Produces:
  - `updateChapterNamesAction(formData: FormData): Promise<FormResult>`. It reads `bookId` and the fields
    `name-1` … `name-N`.
  - `FormRule` `{ kind: 'chapterNames' }`. It validates every `name-*` value with `validateChapterName`.

- [ ] **Step 1: Write failing tests**
- `admin-actions.test.ts`: a non-admin is rejected with `'Forbidden'`. For an admin, a form with `bookId`,
  `name-1=Arrivals`, `name-2=` and `name-7=B&B` returns `{}`. The stored names are then `{ 1: 'Arrivals', 7: 'B&B' }`,
  and `revalidatePath` was called. A 101-character name returns `{ error: 'Chapter names can be at most 100 characters' }`.
- `chapters.test.ts`: `validateFormValues({ kind: 'chapterNames' }, { 'name-1': 'x'.repeat(101) })` returns that
  message. Valid values give `null`.

- [ ] **Step 2: Run the tests and confirm they fail. Implement the action and the rule. Run the tests and confirm they
  pass.**

The action follows `updateBlurbAction`: `requireAdmin()`, `reportingValidation`, `setChapterNames`, then
`revalidateBookPages()`. Collect the names with `/^name-(\d+)$/` over `formData.entries()`.

- [ ] **Step 3: Build `ChapterNamesCard`**

Its props are `{ bookId: string; totalChapters: number; names: { number: number; name: string }[] }`.
- It uses `CARD_PROPS`, and its section is `id="chapter-names"` with `aria-labelledby`. The heading is
  `Chapter names`, and the helper text in `mist` is `Optional. For books whose chapters have names instead of numbers.`
- A show/hide link-style button has `aria-expanded`. It defaults to open when `names.length > 0` and to closed
  otherwise, and its state isn't persisted.
- When open, it shows `<AdminForm action={updateChapterNamesAction} rule={{ kind: 'chapterNames' }} mode="edit"
  layout="custom" submitLabel="Save names" submitVariant="solid" hiddenFields={{ bookId }}>`. Inside are rows 1 to
  `totalChapters`: a chapter-number label and an `Input {...FIELD_PROPS}` with `name="name-N"`, the saved name as
  `defaultValue`, and `maxLength={CHAPTER_NAME_MAX}`. `<AdminFormActions />` goes below the rows.
- **Paste:** an `onPaste` on each input. If the clipboard text contains a newline, it calls `preventDefault()`, reads the
  current values of all row inputs (refs or `form.elements`), and calls `fillDown`. It writes the values back to the
  inputs' `.value`, then calls `dispatchEvent(new Event('input', { bubbles: true }))` on the pasted-into input so
  `AdminForm` re-checks. When `dropped > 0`, it shows `role="status"` text in `mist`:
  `N line(s) didn't fit and were left out.` Single-line pastes aren't intercepted.
- `BookSetup` renders `<ChapterNamesCard bookId={book.id} totalChapters={book.totalChapters} names={book.chapterNames} />`
  after `SectionsCard`. `BookSetup` is already keyed by book, and keying the card by `totalChapters` too resets the rows
  when the count changes.

- [ ] **Step 4: Verify in the app**

Run `npm test` and `npx tsc --noEmit`. In `npm run dev` on `/admin`:
- a book with no names shows the card collapsed
- type a name in row 7, Save, and the card stays open after the reload
- paste a 40-line list into row 1 of a 32-chapter book: rows 1–32 fill, "8 lines didn't fit…" shows, and Save is
  enabled
- clear a row and Save, and that name is gone
- with a name on chapter 24, lowering the count to 20 is refused
- the reader card shows the names from Task 4

- [ ] **Step 5: Commit** with `feat: admin card for entering chapter names`
