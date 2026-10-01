# Reading progress and thread unlocking — design

Date: 2026-10-01
Status: approved in conversation, pending written-spec review

## Context

A new concept design (dark theme, three-pane layout) changes how threads unlock.
Today a reader unlocks a thread by clicking "Join thread" (honor system). The
concept replaces this with a chapter-progress stepper: a thread opens once the
reader has finished its last chapter.

This spec covers only the **progress and unlocking** piece. The dark theme and
shell, the three-pane layout with message bubbles, "Safe ground" badge,
Starters, club name, and the Members / Our shelf pages are separate pieces,
each with their own spec.

## Decisions

- Unlocking is driven by a per-reader, per-book **chapters finished** number
  set with a stepper (+ / −).
- Once unlocked, a thread **stays open**, even if the reader lowers their
  number. Unlocked state is stored, not derived.
- Threads have a chapter range and an **optional title**.
- Past books work the same way, so readers can catch up.
- `totalChapters` is entered on the book, not derived from its sections.

## Data model

- `Book.totalChapters` (Int, required).
- `Section.startChapter`, `Section.endChapter` (Int, required) and
  `Section.title` (String, optional). These replace `Section.label`. The
  display name is derived, e.g. "Chapters 6 to 10", with the title shown
  alongside when present.
- New `ReadingProgress { userId, bookId, chaptersFinished }`, unique on
  `(userId, bookId)`. Progress belongs to a book so past books keep it.
- `ThreadMembership` is unchanged and now means "this reader has unlocked this
  thread".

Rules:

- `0 <= chaptersFinished <= totalChapters`; the server clamps.
- Admin input: `1 <= startChapter <= endChapter <= totalChapters`; rejected
  otherwise.
- `Section.order` and `@@unique([bookId, order])` are unchanged.

### Migration

- Parse existing labels (e.g. "Chapters 11-20") into `startChapter` /
  `endChapter`. An unparseable label aborts the migration with a clear error;
  nothing is guessed.
- Set each existing book's `totalChapters` to the highest `endChapter` among
  its sections. The admin can correct it afterwards.
- Existing memberships and posts are untouched. Everyone's progress starts at 0.
- Drop `Section.label` and the join-by-button flow once nothing reads them. The
  implementation plan must list every reader of `label` and of
  `joinSection` / `JoinSectionButton`.

## Unlock rule and stepper

`setProgressAction(bookId, chaptersFinished)`:

1. Require a signed-in user (redirect to sign-in otherwise).
2. Clamp the number to `0..totalChapters`.
3. In one transaction, upsert `ReadingProgress`, then upsert a
   `ThreadMembership` for every section of the book with
   `endChapter <= chaptersFinished`.
4. Never delete memberships. (Prisma's SQLite driver has no `skipDuplicates`,
   so this is a loop of `upsert` calls.)

Stepper component ("Your place in the book"): − and + buttons around the large
number, "chapters finished, of N" beneath, and a segmented progress bar with one
segment per thread: finished threads in `antiqueGold`, the thread the reader is
partway through in `progressCurrent`, the rest in `progressTodo`. The new number
displays immediately and the buttons are disabled while the request runs.

Placement for now: right column of the main page, above the prompt card (the
layout piece later moves it into the left panel). Also shown on each book's
block on the Past books page.

## Sealed threads

The server withholds data, not the browser. For a thread the reader has not
unlocked, the data sent to the page contains only its chapter range and how far
away it is ("Opens after chapter 15, 3 chapters to go"). It never includes the
title or any posts. Opening a sealed thread by URL still returns 404.
Posting still requires an unlocked thread.

## Admin

- Create book: adds `totalChapters`.
- Add section: `startChapter`, `endChapter`, optional `title`, with the
  validation above. The label editor becomes a section editor for those fields.
- Delete section / delete book: unchanged; confirmation text uses the derived
  name, e.g. "Chapters 6 to 10 · Lowood".
- After any admin change to a section, re-run the unlock check for that book:
  for every `ReadingProgress` row, create any missing memberships. A reader at
  chapter 12 is therefore unlocked into a newly added "Chapters 6 to 10" thread.
- Lowering `totalChapters` below a reader's progress only clamps the displayed
  value.

## Errors

- Out-of-range progress is clamped, not an error.
- Signed-out requests redirect to sign-in.
- Unparseable label in the migration aborts it with a clear message.

## Testing (Vitest, existing setup)

- Setting progress unlocks exactly the sections whose last chapter is at or
  below the number.
- Lowering progress removes no memberships.
- Progress is clamped to `0..totalChapters`.
- Sealed-thread data never contains the title or posts.
- Admin validation rejects start after end and end past the total.
- Adding or editing a section unlocks it for readers who are already far enough
  along.
- The migration's label parsing, including the failure case.

## Out of scope

Dark theme and shell, three-pane layout and message bubbles, "Safe ground"
badge, Starters, club name, Members and Our shelf pages.
