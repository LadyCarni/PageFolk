# Our shelf: cover grid with a book preview panel — design

Date: 2026-10-04
Status: approved in conversation, pending written-spec review

## Context

The concept image (`our shelf.png`, kept out of the repo) shows a redesigned Our shelf page: a header with a read count,
a card explaining the gold bookmark, a grid of covers with a gold ribbon on books the viewer has read and the month the
club read each one, and a preview panel on the right for the selected book. Today `/shelf` is a plain grid showing
title, author and "N of M chapters", and every click goes straight to the three-pane book page at `/shelf/[bookId]`.

The concept is a direction, not a literal spec. Decisions below record what is kept and what is not.

## Decisions

- **Two-pane layout kept**: grid on the left, preview panel on the right, on wide screens.
- **No sort toggle.** The concept's "Most recent / A to Z" is dropped.
- **New optional "Read in" month per book**, stored as `readMonth String?` in `"YYYY-MM"` form. Set from the book
  setup page in admin only, not the Add book form.
- **"Read" means the viewer has finished every chapter** (`chaptersFinished === totalChapters`).
- **No re-sealing.** The concept's "Not finished after all? Seal these again" is dropped. The rule in
  `src/lib/progress.ts` (lowering progress never re-seals) stands.
- **The panel is a preview.** Every interactive element in it opens the existing three-pane page. An explicit
  "Open the full book" button makes that obvious.
- **Sealed sections show in the preview but without note counts.**
- **Generated covers rotate through four colors** (forest, navy, plum, claret), chosen from the book ID. Uploaded covers
  are unchanged.
- **Phones skip the preview.** Below `lg`, tapping a cover goes to the full book page, as today.
- **Selection is client state mirrored to `?book=`** with `history.replaceState`, so it survives a refresh without
  adding history entries.

## Data and admin

### Schema

Add to `Book`:

```prisma
readMonth String? // "YYYY-MM", the month the club read the book
```

A nullable column, applied with `npx prisma db push` (the project does not use migration files). No backfill. A string avoids timezone drift (a `DateTime` for September can
render as August 31) and sorts correctly as text.

### Validation

`validateReadMonth(input: string): string | null` in `src/lib/limits.ts`, next to `validateBlurb`, returning
an error message or `null`:

- Empty string is valid and means clear.
- Otherwise it must match `^\d{4}-(0[1-9]|1[0-2])$`, with the year between 2000 and next year inclusive.

### Admin: book setup header

`BookSetupHeader` gains a "Read in" line under the "Author, N chapters" subtitle:

- Set: **"Read in September 2026 · Edit"**.
- Not set: **"Read in: not set · Set"**.
- Edit opens in place, using the same `AdminForm` pattern as the chapter-count editor: a month `<Select>` (January to
  December) and a year `<Select>` (2000 to next year, newest first), with Save, Cancel and Clear. Native
  `<input type="month">` is not used because desktop Safari and Firefox render it as a plain text box.
- The form posts `bookId` and `readMonth` (`"YYYY-MM"`, or empty to clear) to a new `updateReadMonthAction` in
  `src/app/admin/actions.ts`, following `updateBlurbAction`: admin check, validate, update, `revalidatePath` for
  `/admin` and `/shelf`.

### Formatting

`formatReadMonth("2026-09")` returns `"September 2026"`. It is a pure function that does not depend on the server's
timezone or locale.

## Cover colors

Add theme tokens `coverForest`, `coverNavy`, `coverPlum` and keep `claret`, with values taken from the concept.
`coverColor(bookId)` (pure) hashes the ID to one of the four tokens. `CoverImage` uses it for the generated cover
background everywhere it is shown (This month, shelf, admin).

## The shelf page

### Data

`getShelf(userId)` in `src/lib/shelf.ts` returns past books, ordered, each as:

```ts
type ShelfBook = {
  id: string
  title: string
  author: string
  blurb: string | null
  totalChapters: number
  coverVersion: number | null
  readMonth: string | null
  finished: number          // the viewer's chapters finished, clamped
  read: boolean             // finished === totalChapters
  sections: SectionSummary[] // from getSectionsForViewer, so open/sealed matches the book page
  openNotes: number          // sum of postCount over unlocked sections
}
```

Pure helpers, unit-tested:

- `orderShelf(books)`: books with a `readMonth` first, newest month first; then books without one, newest `createdAt`
  first.
- `shelfSummary(total, read)`: "8 books finished together. You have read 3 of them." Zero read: "You haven't
  finished any yet." With a single book: "1 book finished together. You have read it." or "You haven't finished it
  yet." (`total` is never zero here; the empty state covers that.)

The `ShelfBook` type and these pure helpers live in `src/lib/shelf-view.ts`, free of Prisma so client components can
import them. `getShelf` lives in `src/lib/shelf.ts`. Month formatting helpers live in `src/lib/read-month.ts`.

### Route

`src/app/shelf/page.tsx` stays a server component: `requireUser`, `getShelf`, then renders the header, the explainer
card, and a client `ShelfBrowser` with the books and the initial `?book=` value. `/shelf/[bookId]` is unchanged.

### Layout

- At and above `lg`: a grid of about `3fr : 2fr` filling the height below the header (`NAV_HEIGHT_PX`). Each pane
  scrolls on its own. The right pane uses the `panel` background with a `divider` line between, matching `BookView`.
- Below `lg`: one column with the header, the card and the cover grid. No preview panel.
- Landmarks: the left pane is `main`; the preview is an `aside` labelled "Book preview".

### Header and explainer card

- `h1` "Our shelf", then the `shelfSummary` line.
- The card: a gold bookmark icon, the heading "A gold bookmark means you have read it", and "Books you have finished
  have their conversations open to you. The rest stay sealed, so nothing gets spoiled." Static, not dismissible.

### Cover tiles

Each tile is an anchor to `/shelf/[bookId]` containing:

- `CoverImage` at full tile width.
- A gold ribbon in the top-right corner when `read` is true (decorative; the read state is also in the link's accessible
  name, e.g. "Rebecca, read").
- The formatted month below the cover, when set.

Tiles have a capped size, so a short shelf never stretches covers across the pane. The grid uses
`templateColumns="repeat(auto-fill, minmax(150px, 200px))"` with `justifyContent="start"`, not Chakra's
`minChildWidth`, which uses `minmax(x, 1fr)` and grows tiles to fill the row. With one or two books the covers stay at
most 200px wide and sit at the left, with empty space after them. A full shelf wraps into as many 150–200px columns as
fit.

Click handling in `ShelfBrowser`:

- On `lg` and wider (checked with `matchMedia` at click time), a plain primary click with no modifier keys calls
  `preventDefault` and selects the book. Clicking the book that is already selected is not intercepted, so it opens the
  full book.
- Modifier clicks (Cmd, Ctrl, Shift, middle button) and all clicks below `lg` follow the link.
- The selected tile has a gold outline and `aria-current="true"`.

### Empty state

No past books: the header with "No past books yet." No card, grid or panel.

## The preview panel

`ShelfPreview` (client) renders the selected `ShelfBook`. Every link goes to the full book page: `/shelf/[bookId]`,
or `/shelf/[bookId]?thread=<sectionId>` for an open conversation.

1. **Top block**: the cover (a link, about 180px wide) beside:
   - an eyebrow, "READ IN SEPTEMBER 2026", left out when `readMonth` is null;
   - the title as an `h2` link, and the author in italics;
   - a status pill: "You have read this" (`read`), "12 of 27 chapters read" (`finished > 0`), or "Not started".
2. **"Open the full book →"**: a gold outline button-link, directly under the top block.
3. **Blurb**, when present.
4. **Stats row**: `totalChapters` chapters, `sections.length` conversations, `openNotes` notes (singular when 1).
5. **Conversations**: heading "Past conversations".
   - Read: subline "You have finished this book, so every thread is open."
   - Not read: subline "You have read 12 of 27 chapters." (or "You haven't started this book." at zero).
   - Unlocked row: the section title if set, otherwise "Chapters 1 to 9", plus "11 notes", and a chevron. Links to the
     thread.
   - Locked row: dimmed, with a lock icon, the chapter range and "Sealed · 6 chapters to go". No note count. Links to
     `/shelf/[bookId]`.
   - No sections: "No conversations were set up for this book."

Behavior:

- The initial selection is the book matching `?book=`, or the first book when it is missing or unknown.
- On selection: update state, scroll the panel to the top, and call
  `history.replaceState(null, '', '/shelf?book=<id>')`.
- The panel has `aria-live="polite"` on the title region so screen readers announce the change.

## Testing

Unit (`tests/lib`):

- `orderShelf`: months first, newest first; no-month books by `createdAt` descending; ties stable.
- `shelfSummary`: plural, singular and zero-read wording.
- `validateReadMonth`: valid, empty, bad format, month 00 and 13, out-of-range years.
- `formatReadMonth`: all twelve months render, and there is no timezone shift.
- `coverColor`: deterministic, and over a set of IDs every color appears.

Database (`tests/lib/shelf.test.ts`, in the style of `book-view.test.ts`):

- Only past books are returned.
- `read` is true only at `finished === totalChapters`.
- Sections match `getSectionsForViewer`.
- `openNotes` excludes posts in sealed sections.

Action (`tests/app/admin-actions.test.ts`): `updateReadMonthAction` saves, clears, rejects invalid input, and refuses
non-admins.

Manual: run locally, then check the shelf at desktop and phone widths, selection, modifier-click, a refresh with
`?book=`, and the admin "Read in" editor.

## Rollout

- Branch `shelf-redesign`; merge to `master` once the user approves it locally.
- Production: the usual update steps, which already include `npx prisma db push`; it adds the nullable column without data loss. No new dependencies.
- After deploy, set "Read in" months on existing books through admin.

## Out of scope

- Sorting or filtering the shelf.
- Re-sealing conversations.
- A preview on phones.
- Setting the month from the Add book form.
