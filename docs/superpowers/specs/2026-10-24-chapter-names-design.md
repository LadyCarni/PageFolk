# Chapter names — design

Date: 2026-10-24
Status: approved in conversation, pending written-spec review

## Context

Some books don't number their chapters; they only name them ("B&B"). The app knows chapters only by number:
`Book.totalChapters`, `Section.startChapter/endChapter`, and `ReadingProgress.chaptersFinished`. A reader who has just
finished "B&B" opens the progress card, sees only − and +, and can't tell how many times to tap.

The fix: an admin can optionally give chapters names, and the reader screens show those names next to the numbers.
Progress and unlocking stay number-based; names are labels only.

## Goals

- A reader can tap + until the card names the chapter they just closed.
- Sealed thread cards and the thread's safe-ground pill name the chapter that matters.
- Entering names is optional, tolerant of partial lists, and out of the way when unused.

## Non-goals

- Fetching tables of contents automatically. Goodreads has no public API; Open Library's coverage is patchy. Maybe
  later, separately.
- Changing how progress is stored or how threads unlock.
- Names on open thread cards or in section range labels ("Chapters 1 to 7").

## Anti-goals

- Any change to a book with no chapter names on the reader screens. They must look exactly as they do today. (The
  admin setup page still shows the collapsed Chapter names card.)
- A missing name shifting later names onto the wrong chapters. Each name is tied to its chapter number.

## Data

New model in `prisma/schema.prisma`:

```prisma
model ChapterName {
  bookId String
  number Int     // 1-based chapter number
  name   String

  book Book @relation(fields: [bookId], references: [id])

  @@id([bookId, number])
}
```

`Book` gains `chapterNames ChapterName[]`. Rows exist only for named chapters; a blank name means no row. The schema is
applied with `prisma db push`, like the rest of the project. No backfill is needed.

`deleteBook` in `src/lib/books.ts` also deletes the book's `ChapterName` rows, inside its existing transaction.

### Limits (`src/lib/limits.ts`)

- `CHAPTER_NAME_MAX = 100` characters after trimming (builder's call on the number).
- Names are trimmed. Empty after trimming means unnamed.

## Server

### `src/lib/chapter-names.ts` (new)

- `getChapterNames(bookId): Promise<Record<number, string>>` returns a map from chapter number to name, keyed by number.
- `setChapterNames(bookId, names: Record<number, string>)` replaces the book's names in one transaction: delete all of
  them, then insert the non-blank ones. It validates each name's length, and that every number is a whole number from 1
  to `totalChapters`. On failure it throws `ValidationError`.
- A pure helper for display, which `src/lib/chapters.ts` also fits, e.g.
  `chapterLabel(number, names) → { number, name: string | null }`. Formatting stays in the components.

### Lowering the chapter count

`updateTotalChapters` already refuses to go below the last thread's end chapter. It gains a matching rule: it can't go
below the highest named chapter either. The message reads like the existing one, e.g. "Total chapters cannot be less than
24, the last chapter with a name". Raising the count needs nothing extra. The client-side `rule={{ kind: 'total',
minTotal }}` in `BookSetupHeader` uses the larger of the two minimums.

*(This was described in conversation as "warns you". Blocking with a message is the existing pattern for threads, and it
can't lose names, so it's the builder's call.)*

### Admin action (`src/app/admin/actions.ts`)

`updateChapterNamesAction(formData)` calls `requireAdmin()`, reads the `bookId` plus one field per chapter (e.g.
`name-1` … `name-N`), calls `setChapterNames`, then `revalidateBookPages()`. It returns a `FormResult` like the other
actions.

### Reader data

- `BookViewData.book` gains `chapterNames: Record<number, string>`. `getBookView` loads it in the same `Promise.all`.
- The sealed `SectionSummary` shape gains `endChapterName: string | null`. This is a deliberate addition to the "sealed
  exposes only its range" guarantee: chapter names are table-of-contents information, not spoilers. The comment on the
  type is updated to say so. The thread title and posts are still never exposed.
- `ThreadResult` (unlocked) gains `endChapterName: string | null`.
- Any other place that builds these shapes or renders `ProgressStepper` / `ThreadCard` / `ThreadPane` (shelf book pages,
  section pages, mobile views) passes the same data through.

## Reader UI

### Progress card (`ProgressStepper`)

It takes a new prop `chapterNames: Record<number, string>`.

- **No names on the book** (empty map): renders exactly as today.
- **The book has names:** a new line goes between "Your place in the book" and the −/+ row:
  - a small line `Last finished · Chapter 7` in `mist`, `xs`/`sm`
  - below it the name, *B&B*, in the heading font, italic, `parchment`
  - When the last finished chapter has no name, it shows only `Last finished · Chapter 7`.
  - At 0 finished it shows `Not started yet` (builder's call; it could also be hidden, but keeping the line avoids the
    card jumping in height).
- It updates immediately with the optimistic `finished` value on each tap.
- The name line goes inside the existing `aria-live` region, or gets its own, so screen readers hear the name change.

Visual reference: option A in `.superpowers/brainstorm/537267-1792863122/content/progress-card.html`.

### Sealed thread card (`ThreadCard`, locked branch)

`Opens after chapter 12, 5 chapters to go` becomes `Opens after chapter 12 · The Lighthouse, 5 chapters to go`, with the
name in italics. Without a name it's unchanged.

### Safe-ground pill (`ThreadPane`)

`Safe ground: nothing past chapter 7` becomes `Safe ground: nothing past chapter 7 · B&B`, with the name in italics.
Without a name it's unchanged.

### Unchanged

Open thread cards, range labels, section titles, and the progress bar.

Visual reference: `.superpowers/brainstorm/537267-1792863122/content/thread-names.html`.

## Admin UI

### Chapter names card (new, e.g. `src/components/ChapterNamesCard.tsx`)

- It sits on the book setup page below `SectionsCard`, and uses `CARD_PROPS` and the `AdminForm` patterns.
- **Collapsible.** The heading row has a show/hide toggle. It starts collapsed when the book has no names and expanded
  when it has any. The toggle state isn't persisted (builder's call).
- The card shows a short helper line when collapsed or at the top, e.g. "Optional. For books whose chapters have names
  instead of numbers."
- **One row per chapter**, 1 to `totalChapters`: the chapter number as a label, then a text input with
  `maxLength={CHAPTER_NAME_MAX}`. Rows are pre-filled with saved names.
- **Paste to fill down.** Pasting multi-line text into a row puts the first non-blank line in that row and each
  following non-blank line in the next rows. Lines beyond the last chapter are dropped, and the card says how many were
  dropped. Single-line pastes behave normally.
- **One "Save names" button** submits every row. Blank rows clear that chapter's name.
- The rows change when `totalChapters` changes. The card is keyed by book, like `BookSetup`.
- It is **not** part of setup completion: the `CompletionChips` and `completion` stay as they are.

## Testing

- `tests/lib/chapter-names.test.ts`: it saves and reads back; blank names are dropped; trimming; length limit;
  out-of-range numbers are rejected; a save replaces earlier names.
- `updateTotalChapters` refuses to go below the highest named chapter and still allows going below it once those names
  are cleared.
- `deleteBook` removes chapter names.
- `getSectionsForViewer` / `getSectionThread` include `endChapterName` when the chapter is named and `null` otherwise.
  Sealed summaries still omit the title.
- Admin action: non-admins are refused, and a successful save revalidates.
- Paste fill-down logic as a pure function (e.g. `fillDown(rows, startIndex, pastedText)`), unit-tested.

## Left to the builder

The exact component split, field naming in the form, the toggle control's look, the paste-overflow message wording, and
whether the display helper lives in `chapters.ts` or `chapter-names.ts`.
