# Three-pane layout, header, Members and book blurb — design

Date: 2026-10-01
Status: approved in conversation, pending written-spec review

## Context

The concept image (`bookclub concept.png`, kept out of the repo) shows the target main page: a book panel, a
"conversations" list and the open thread side by side, with message bubbles and a composer. The data side
(chapter progress, sealed threads) and the dark theme are already built and merged. This spec covers the layout and
the pieces that go with it: header and nav, the Members page, the Our shelf page, the book blurb, and the club name.

## Decisions

- **One server-rendered page, thread chosen by the URL** (`?thread=ID`). No client-side thread state.
- The open thread appears in the right pane; the separate thread page goes away (old URLs redirect).
- Everything in the concept is in scope except the "first published" year, which is dropped entirely.
- Club name is an admin-editable setting (one-row table).
- Members page shows names and avatars only.
- Existing theme tokens only; no new colors.

## Routes

| Route | Purpose |
|---|---|
| `/` | "This month": three-pane view of the current book |
| `/shelf` | "Our shelf": cards for past books (cover, title, author, the viewer's progress) |
| `/shelf/[bookId]` | Same three-pane view for a past book. A book that is the current book redirects to `/`, keeping `?thread=` |
| `/members` | Members page |
| `/sections/[sectionId]` | Redirects to `/?thread=ID`, or `/shelf/[bookId]?thread=ID` when the book is not the current one. Unknown ID: 404 |
| `/past-books` | Redirects to `/shelf` |

Admin, allowed-emails, sign-in and the cover route are unchanged.

`/` and `/shelf/[bookId]` render one shared `BookView` for a given book. It loads, in one pass: the book, the
viewer's progress, the thread list (existing `getSectionsForViewer`), and the selected thread (existing
`getSectionThread`).

### Selecting a thread

- `?thread=ID` selects it. An unknown or sealed ID is treated as no selection and reveals nothing, so the sealed-thread
  guarantee is unchanged.
- With no valid `thread` parameter, the default is the open thread with the highest `order`. If there is no open
  thread, the right pane shows its empty state.
- Thread cards are links to `?thread=ID` with scroll position preserved.

## Header

- Gold wordmark and diamond, then the club name (omitted when it has not been set), then the nav links: **This month**
  (`/`), **Our shelf** (`/shelf`, including `/shelf/...`), **Members** (`/members`), and **Admin** for admins.
- The current section's link is underlined in gold (route-based, so a small client component).
- On the right: the viewer's avatar and a **Sign out** link.
- Signed-out pages show no nav, as today.

## Left pane: the book

- Cover: the uploaded image when there is one; otherwise a generated Claret panel with a double gold border, the
  title in Cormorant and the author beneath.
- Small label ("THIS MONTH'S BOOK", or "ON OUR SHELF" for past books), title, author in italics.
- The blurb, when set.
- The existing "Your place in the book" stepper at the bottom (unchanged behavior).

## Middle pane: the conversations

- Heading "The conversations" and the line: "Threads open once you finish its last chapter. Sealed threads show
  nothing so no spoilers!"
- Cards, three states:
  - **Unlocked, regular:** fill `#2d1d26` (`mulberry`), border `#6b4a5b` (`borderOpen`).
  - **Unlocked, active** (the selected thread): fill `#3a2230` (`bubbleMine`), border `#d4b06a` (`antiqueGold`).
  - **Sealed:** fill `#1d131a` (`sealed`), dashed border `#7a5568` (`borderMuted`), a lock, "Sealed" in italics and
    "Opens after chapter N, X chapters to go". Shows no title.
- Open cards: a small gold range label ("CHAPTERS 6 TO 10"), the title (the range when there is no title), "N notes"
  (all posts in the thread, replies included) and a chevron. The active card has `aria-current="true"`.

## Right pane: the thread

- Header: the range label, the title, and a pill: shield icon (FontAwesome `faShield`) and "Safe ground: nothing past
  chapter N", where N is the thread's last chapter.
- Notes in chronological order, newest at the bottom. The pane opens scrolled to the bottom, and scrolls to the bottom
  after the viewer posts.
- Each note is an **avatar outside a bubble**, with the member's name in Dusty rose, the text, and the existing
  timestamp. Other members' bubbles use `bubbleOther`; the viewer's use `bubbleMine`. Replies are indented with a
  smaller avatar.
- Under each note: **Reply** (toggles an inline composer for that note), **Hide replies / Show replies** (only when the
  note has replies; replies are visible by default; client-side state), and **Delete** on the viewer's own notes
  (existing confirmation and cascade).
- Composer bar, fixed at the bottom of the pane: **Starters** button, a text area, and a gold circular send button.
  - The text area starts at one line, grows as the viewer types up to **6 lines**, then scrolls inside itself.
  - Starters and the send button stay aligned to the bottom of the bar as the text area grows.
  - Enter inserts a newline; Ctrl/Cmd+Enter or the send button posts. Empty (whitespace-only) notes cannot be sent.
  - Starters opens a popover with the existing discussion prompts; choosing one puts it in the text area (appended on
    a new line if the box already has text) and focuses it.
- Empty state (no thread selected or none open): italic "Pick a conversation to read the notes."
- The "What do you think?" card is removed; Starters replaces it.

## Layout and responsiveness

- At and above the large breakpoint: a three-column grid (about 1 : 1.15 : 1.8) filling the height below the header;
  each pane scrolls on its own with thin dark scrollbars. The right pane uses the `panel` background; panes are
  separated by `divider` lines.
- Below it, one pane at a time (CSS only). With no explicit `?thread=`, the book panel and thread list show. With one,
  the thread fills the screen with a "Back to conversations" link.
- Landmarks: left pane `aside`, middle `nav` labelled "Conversations", right `main`.

## Members page

- Heading "Members" with the count; a grid of every user who has signed in: avatar and name ("Member" when there is no
  name), sorted by name.
- Emails and reading progress are never shown.

## Our shelf page

- Cards for books with status `past`: cover (or generated panel), title, author, and the viewer's "N of M chapters"
  progress. Each links to `/shelf/[bookId]`. Empty state: "No past books yet."

## Data changes (additive; `prisma db push`, no backfill)

- `Club` (single row): `name`. Library: `getClubName(): Promise<string | null>` (null when unset),
  `setClubName(name)` (trims; 1 to 40 characters; creates or updates the one row).
- `Book.blurb` (`String?`). Library: `setBlurb(bookId, text)` (trims; at most 1,000 characters; empty clears it to
  null).
- `getSectionThread` unlocked result gains `title`, `startChapter` and `endChapter` (keeping `name`), for the header
  and the Safe ground pill. The locked result stays `{ status: 'locked' }`.
- `listMembers()`: `{ id, name }` for every user, sorted by name; never selects email.
- Pure helpers: `pickDefaultThread(sections)` (open thread with the highest `order`, or null) and
  `threadHref(section, currentBookId)` (the redirect target).

## Admin

- A "Club name" form at the top of the admin page and a blurb text area on each book, both using the existing
  Save/Cancel live-validation form. `AdminForm` gains text-area support (it currently reads only inputs) and two new
  rules in `validateFormValues`: `clubName` and `blurb`, with the limits above and the same messages as the server.
- Server actions return `{ error }` through `ValidationError`, as the other admin actions do.

## Removed or replaced

`DiscussionPromptCard` (prompts move to `src/lib/prompts.ts` and feed Starters), `SectionRow` (replaced by the thread
card), `PostForm` (replaced by the composer and the inline reply composer), `src/app/past-books/page.tsx`, and the body
of `src/app/sections/[sectionId]/page.tsx` (becomes the redirect).

## Testing

- Library tests: club name (unset gives null; set trims; blank and over-40 rejected; one row only), blurb (set, trim,
  clear, over-limit rejected), `listMembers` (sorted, no email property, unnamed users), `getSectionThread` extra
  fields (and that locked still carries nothing).
- Pure helper tests: `pickDefaultThread`, `threadHref`, and the new `validateFormValues` rules.
- Existing sealed-thread, progress and admin-action tests keep passing.
- The panes, composer growth and responsiveness are visual; they are verified in the browser.

## Out of scope

Real-time updates (new notes from others appear on refresh or after the viewer's own post), unread counts, search,
editing notes, reactions, and per-member progress on the Members page.
