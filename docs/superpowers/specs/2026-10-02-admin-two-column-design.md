# Admin two-column layout, completion chips and chapter coverage — design

Date: 2026-10-02
Status: approved in conversation, pending written-spec review

## Context

The concept images (`admin.png`, `admin discussion sections.png`, `admin books.png`, kept out of the repo) show a new
admin page. It follows the main page's column pattern: club settings and the book list on the left, and the setup of
one book on the right. The right column adds completion chips (Description, Cover, Sections) and a bar showing how much
of the book the discussion sections cover. Today the admin page is a single stacked list where every book is expanded
with inline forms.

## Decisions

- **The viewed book is chosen by the URL** (`/admin?book=ID`), like `?thread=` on the main page. The page stays
  server-rendered.
- **The Sections chip is done only when sections cover chapters 1 to N with no gaps**, so it always agrees with the
  coverage bar. (The concept shows it checked at 15 of 38; that is intentionally not followed.)
- **Section add and edit expand inline**, with no modals.
- Kept from today, though not in the concept: editing total chapters, removing a cover, and **Mark as current** on
  past books (to undo an accidental Mark as past).
- **Allowed emails move to the Members page**, visible to admins only. `/admin/allowed-emails` redirects there.
- The cover limit is the real `MAX_COVER_BYTES` (500 KB). The concept's "500 MB" is placeholder text.
- No schema changes. Existing theme tokens only.

## Layout

- At and above the `lg` breakpoint, a two-column grid (about `1fr : 2fr`) fills the height below the header
  (`NAV_HEIGHT_PX`). Each column scrolls on its own. Columns are separated by a `divider` line, and the right column
  uses the `panel` background, matching `BookView`.
- Landmarks: the left column is an `aside` labelled "Admin"; the right column is `main`.
- Below `lg`, one column shows at a time, using CSS only. With no explicit `?book=`, the left column shows. With one,
  the book setup shows with a "Back to books" link (`/admin`).

### Choosing the book

`pickAdminBook(books, requestedId)` (pure; `books` as returned by `listBooks()`, newest first):

1. The book whose ID is `requestedId`, when it exists.
2. Otherwise the first book with status `current`.
3. Otherwise the first (newest) book.
4. Otherwise null. The right column then shows an italic empty state: "Add a book to start setting it up."

"Explicit" (for small screens) means `?book=` named a book that exists.

## Left column

- Heading "Club admin" and the line "Name your club, add books and shape the conversations."
- **Club name card:** small "CLUB NAME" label, the existing club-name `AdminForm` (input with the Save button beside
  it), and the hint "Shown in the top bar for every member."
- **Add a new book card:** heading "Add a new book" and stacked labelled fields: Title (placeholder "e.g. Rebecca"),
  Author ("e.g. Daphne du Maurier") and Number of chapters, with a gold "+ Add book" button beside the chapters field.
  Live validation is unchanged. On success, `createBookAction` redirects to `/admin?book=<new id>`.
- **Your books:** heading, then one card per book (newest first):
  - Title (Cormorant), "Author, N chapters", and a badge: CURRENT (claret fill, gold text) or PAST (muted outline).
  - The card title is a link to `/admin?book=ID`. The selected card has a gold border, `bubbleMine` fill and
    `aria-current="true"`. Others use `mulberry` with the `borderOpen` border.
  - Current books: an outline "Mark as past" button and a danger-outline "Delete book" button.
  - Past books: an outline "Mark as current" button and "Delete book".
  - Delete keeps its existing confirmation. After deleting the selected book, its ID no longer exists, so
    `pickAdminBook` falls back to the default book.
  - Marking a book current does not demote other current books (unchanged behavior).

## Right column: book setup

### Header

- "BOOK SETUP" label (`dustyRose`, small caps), the title (`h1`, Cormorant), and "Author, N chapters" in italic `mist`.
- An "Edit" link after the chapter count swaps it for the existing total-chapters `AdminForm` (number field, Save,
  Cancel). Cancel or a successful save swaps back. The rule that the total cannot be less than the last section's end
  is unchanged.
- **Completion chips**, top right, wrapping under the title when narrow:

  | Chip | Done when |
  |---|---|
  | Description | the blurb is set |
  | Cover | an uploaded cover exists |
  | Sections | `chapterCoverage(...).complete` |

  - Done: gold border, check icon, `mulberry` fill. Not done: `borderMuted` border, empty-circle icon, no fill.
  - Each chip links to its card (`#description`, `#cover`, `#sections`). Its accessible name states the state, e.g.
    "Description: done", "Cover: not set", "Sections: not all chapters covered".

### Description and Cover card

Two columns at `md` and up (description wider); stacked below.

- **Description** (`id="description"`): heading, the hint "Shown on the book page. Keep it spoiler-free.", the blurb
  textarea, and a gold "Save description" button. The existing `AdminForm` live validation and Cancel apply. When
  there are no unsaved changes, a quiet "Saved" shows beside the button.
- **Cover** (`id="cover"`): heading, then `CoverImage` (the uploaded image, or the generated Claret placeholder).
  - Without a cover: "No cover yet. This placeholder is shown instead."
  - An outline "Choose cover image" button (or "Replace cover image" when one exists) opens the file picker. Choosing
    a file uploads it straight away. The client-side size check and its message stay. While uploading, the button is
    disabled.
  - "Remove cover" (danger link) when a cover exists.
  - "JPG, PNG or WebP, up to 500 KB." (from `MAX_COVER_BYTES`).

### Discussion sections card (`id="sections"`)

- Heading "Discussion sections", the text "Each section becomes a conversation thread. Readers unlock it by finishing
  its last chapter. A name stays hidden until then.", and a gold "+ Add section" button.
- **Coverage bar:** one segment per section and per gap, in chapter order, each sized by its chapter count. Section
  segments are `antiqueGold`; gaps are `progressTodo`. Small gaps separate segments. It is `role="img"` with the
  summary sentence as its `aria-label`.
- **Summary line:**
  - No sections: "No sections yet."
  - Partial: "**15 of 38 chapters are in a section.** Not yet covered: chapters 16 to 38."
  - Complete: "**All 38 chapters are in a section.**"
- **Section rows** (`mulberry` cards, in order): gold range label ("CHAPTERS 1 TO 5", or "CHAPTER 7"), the title in
  Cormorant (the range when untitled), an outline "Edit" button and a danger-outline "Delete" button. Delete keeps
  its post-count confirmation.
- **Edit** swaps the row for an inline form: From, To, Title, Save, Cancel. Only one row edits at a time; opening
  another closes the first. Cancel or a successful save closes it.
- **Add section** opens a blank inline form at the top of the list, with From pre-filled to the first uncovered
  chapter (empty when complete). Cancel or a successful save closes it. Opening it closes any row being edited.
- Live range and overlap validation is unchanged.

## Pure helpers (`src/lib/chapters.ts`)

```ts
type Range = { start: number; end: number }

chapterCoverage(
  totalChapters: number,
  sections: { startChapter: number; endChapter: number }[]
): {
  covered: number          // chapters inside some section
  total: number
  complete: boolean        // covered === total
  gaps: Range[]            // uncovered runs, in order
  segments: (Range & { covered: boolean })[]  // sections and gaps together, in order, spanning 1..total
}

formatGaps(gaps: Range[]): string
// [] → ''
// [{16,38}] → 'chapters 16 to 38'
// [{4,4}] → 'chapter 4'
// [{4,4},{9,12},{30,38}] → 'chapters 4, 9 to 12 and 30 to 38'
```

Sections are assumed non-overlapping (the server enforces it). They need not arrive sorted.

## Members page: allowed emails (admins only)

- Below the members grid, admins see an "Allowed emails" card: the hint "Anyone on this list can sign in with
  Google.", an email field with a gold "Add" button, and the list with a danger "Remove" link on each. `ADMIN_EMAIL`
  is not listed (unchanged).
- `listAllowedEmails()` is called only when the viewer is an admin, so non-admins never receive emails.
- `addAllowedEmailAction` and `removeAllowedEmailAction` stay in `src/app/admin/actions.ts`, still `requireAdmin`, and
  now revalidate `/members`.
- `/admin/allowed-emails` becomes a redirect to `/members`.
- Removing an email still does not affect someone who has already signed in (unchanged).

## Components and files

| File | Change |
|---|---|
| `src/app/admin/page.tsx` | Rewritten: grid, `?book=` resolution, composes the components below |
| `src/components/AdminBookList.tsx` | New: "Your books" cards |
| `src/components/BookSetupHeader.tsx` | New: title, subtitle, total-chapters edit (client, for the toggle), chips |
| `src/components/CompletionChips.tsx` | New |
| `src/components/DescriptionCoverCard.tsx` | New |
| `src/components/SectionsCard.tsx` | New, client: owns which row is editing and whether the add form is open |
| `src/components/CoverageBar.tsx` | New |
| `src/components/AllowedEmailsPanel.tsx` | New |
| `src/components/AdminForm.tsx` | Optional stacked layout (labels above fields); solid or outline submit; optional "Saved" status when unchanged; `onSuccess` callback |
| `src/components/CoverUpload.tsx` | Upload on file choice; new button style and help text |
| `src/lib/chapters.ts` | `chapterCoverage`, `formatGaps` |
| `src/lib/admin-view.ts` | New: `pickAdminBook` |
| `src/app/admin/actions.ts` | `createBookAction` redirects to the new book; allowed-email actions revalidate `/members` |
| `src/app/members/page.tsx` | Renders `AllowedEmailsPanel` for admins |
| `src/app/admin/allowed-emails/page.tsx` | Becomes a redirect to `/members` |

## Testing

- Unit: `chapterCoverage` (no sections; complete; gap at start, middle and end; several gaps; single-chapter
  sections; unsorted input), `formatGaps` (none, one, single chapter, two, many), `pickAdminBook` (valid ID, unknown
  ID, no current book, no books).
- Actions: `createBookAction` redirects to `/admin?book=<id>` on success and returns `{ error }` on validation failure;
  allowed-email actions still reject non-admins.
- Existing admin, section and allowlist tests keep passing.
- Visual, in the browser: chips, bar and rows against the concept; inline add and edit; the total-chapters edit;
  cover upload on choose; small-screen column switching; the Members page as an admin and as a member.

## Out of scope

Editing a book's title or author, reordering sections, demoting other books when one is marked current, and any
schema change.
