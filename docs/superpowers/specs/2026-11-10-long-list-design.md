# The Long List: book suggestions and voting

Date: 2026-11-10
Mockups: `.superpowers/brainstorm/2234720-1794361357/content/` (gitignored). `list-layout-v2.html` option C is the chosen list. `details-panel.html` option E is the chosen panel.

## Why

The club picks its next book at an in-person meetup. At the moment, there's nowhere in PageFolk to collect the books people want to read or to see which ones have support. The Long List gives the club that place. Any member can suggest a book at any time, and everyone votes on the ones they'd like to read. At the meetup, the club looks at the list together, ranked by votes, and decides. Then Caryn (admin) sets up the chosen book in the app and it leaves The Long List.

The votes don't pick the book. They help the conversation at the meetup. That's why the vote count and the names of the voters both matter: someone can make the case for a book they and others voted for.

## Goals

- **Bookshelf** replaces **Our shelf** in the main nav. It is a menu with two items: **Our shelf** (today's page, unchanged) and **The Long List**.
- A Long List page that stays easy to scan when it holds many books.
- Any member can suggest a book. No approval is needed, so it appears for everyone straight away.
- One vote per member per book. Members vote for as many books as they like and can take a vote back.
- Three sort options: **Most liked** (default), **Newest**, **A–Z**.
- On screen, voting is called **liking** (changed after review): "Like" / "✓ Liked", "7 likes", "Most liked". Code and data keep the vote names.
- A details panel with the full synopsis and the names of everyone who voted.
- Members can edit and delete their own suggestions.
- The admin can turn a suggestion into a club book. That removes the book from The Long List.
- The data model leaves room for version 2, which will add Google Books lookup.

## Non-goals (for now)

- **Google Books search.** Version 2 will be a search box that fills in the suggestion form. Version 1 stores the fields it will need (see Data) but has no lookup.
- Real book covers. Rows and the panel use the generated coloured covers the app already has.
- Alerts or a nav dot when someone adds a book.
- Comments or discussion on suggestions. The meetup is the place for that.
- A history of past suggestions or old vote counts. Once a book is chosen or deleted, it and its votes are gone from The Long List.
- Approval or moderation of suggestions before they appear.
- Ranked-choice voting, or limiting each member to one vote overall.

## Anti-goals

- The list must not become a wall of cards. It has to stay condensed and scannable with dozens of books.
- A member must never be able to vote twice on the same book, even with a double tap.
- A member must not be able to edit or delete someone else's suggestion. Only the admin can.
- Our shelf must not change, apart from moving under the new menu.

## Navigation

- The **Our shelf** nav item becomes **Bookshelf**. It is a dropdown menu like the existing Admin menu (`NavLinks.tsx`), with **Our shelf** (`/shelf`) and **The Long List**.
- **Bookshelf** shows as active when on either page.
- On phones the nav already collapses into one menu (`MobileNav.tsx`). There, Bookshelf's two items appear as a labelled group, or as two indented items, in the same way Admin's items appear.
- Check that the desktop nav still fits for both testers and the admin.

## The Long List page

Route: `/long-list` (builder's call; see "Left to the builder"). Members only, behind the same `requireUser()` check as the rest of the app.

### Header

- Heading "The Long List".
- A summary line, e.g. "12 books suggested · like as many as you want". It handles 1 book (singular) and 0 books.
- A gold **Suggest a book** button.
- Sort options in pill buttons, as in the mockup: **Most liked** (default), **Newest**, **A–Z**. The chosen sort lives in the URL (e.g. `?sort=newest`), so it survives a refresh and a shared link shows the same order.
  - Most liked: like count, highest first. Ties go to the newest suggestion first.
  - Newest: most recently suggested first.
  - A–Z: by title, ignoring case and a leading "The", "A" or "An" (builder may simplify to ignoring case only).

### Rows (option C, decided)

One condensed row per book, top to bottom:

1. **Small generated cover** (`CoverMark`): the book's cover colour from `cover-color.ts`, with the shelf's double gold frame and diamond but no title or author, since the space is too small for text. When version 2 adds `coverUrl`, it shows that image instead. (Changed after review: no rank number. The order and vote counts already show which books lead, and a number means nothing under Newest or A–Z.)
2. **Title** (serif, parchment, larger than the author line, all sharing one text baseline), then "by **Author**" (mist), then a **genre** pill (dusty rose outline) if one is set.
3. **Synopsis** on one line, cut off with "…".
4. On the right: the **like count** ("7 likes", "1 like", "0 likes") and a **Like** button. If the viewer has liked it, the button is gold and reads **✓ Liked**. Clicking it again removes the vote. Voting from a row does not open the panel.

Clicking anywhere else on a row selects that book in the details panel. The selected row is highlighted (`bubbleMine`, as in the mockup).

### Empty state

If no books have been suggested, the page shows a short, friendly line inviting the member to suggest the first one, with the Suggest a book button. The panel is not shown.

## The details panel (option E, decided)

Works like the Our shelf preview panel (`ShelfBrowser.tsx`). Builder should reuse or follow that pattern.

- **Wide screens (lg and up):** two columns, list on the left (about 3fr) and panel on the right (about 2fr). The panel is always visible and shows the selected book. With no `?book=` in the URL, it shows the first book in the current sort. The selection is kept in the URL (`?book=<id>`) with `replaceState`, as on Our shelf, so a refresh keeps it.
- **Phones and narrow screens:** there's no side panel. Tapping a row opens the book as its own page (e.g. `/long-list/<id>`) with a Back link to the list.

Panel contents, top to bottom:

- Generated cover (larger), **title**, **author**, **genre** pill.
- "Suggested by **Name** · 3 Oct". Shows "Suggested by you" for the viewer's own suggestions.
- The **Like / ✓ Liked** button, the same behaviour as in the row.
- The full **synopsis**.
- A "**7 likes**" label, then the voters as small avatar-and-name pills (`UserAvatar`), showing "You" for the viewer. Ordered by when they voted, earliest first.
- **Edit** and **Delete my suggestion**: shown to the person who suggested the book. The admin sees **Edit** and **Delete** on every book.
  - Delete asks for confirmation ("Remove *Title* from The Long List? Its likes will be removed too.").
- **Admin only:** a **Choose this book** button, set apart under a small dashed divider labelled "Admin", as in the mockup. See "Choosing a book."

If the selected book is deleted or chosen while someone has it open, the panel falls back to the first book in the list after the next refresh.

## Suggest a book form

Opened by **Suggest a book**. It's a pop-up (Chakra modal) on all screen sizes.

Fields:

| Field | Required | Notes |
|---|---|---|
| Title | yes | trimmed, max 200 characters |
| Author | yes | trimmed, max 200 characters |
| Genre | no | dropdown from `GENRES` in `src/lib/genres.ts`, with an empty "No genre" option. Validated with `validateGenre`. |
| Synopsis | yes | textarea, max 300 characters, with a live counter. Placeholder along the lines of "A sentence or two about the book." |

- **Buttons:** gold **Add to the Long List**, and **Cancel**.
- **Duplicates:** title and author are compared ignoring case and repeated or surrounding spaces. Saving fails if either of these matches (decided by Caryn):
  - **A book already on The Long List.** "That book is already on the Long List," with a link that selects it.
  - **One of the club's own books** (`Book`, any status):
    - `past`: "The club has already read that one," linking to `/shelf/<id>`.
    - `current`: "That's the club's current book," linking to `/`.
    - `upcoming`: "That one's already lined up for the club," with no link.

  This check also runs on edit, excluding the book being edited.
- **After saving:** the modal closes, the list refreshes, and the new book is selected in the panel (or opened, on phones).
- Errors use the same form-error pattern as the rest of the app (`form-state.ts`, `ValidationError`).

### Editing

**Edit** opens the same modal with the fields filled in, titled "Edit suggestion," with a **Save changes** button. Editing keeps every vote. Only the person who suggested the book, or the admin, can edit. This is enforced in the server action, not only by hiding the button.

## Voting

- One vote per member per book, enforced by the database (composite primary key), as `RoadmapVote` does.
- Toggle behaviour, the same as `toggleVote` in `src/lib/roadmap.ts`: remove if present, otherwise create, and treat a unique-constraint race as "on".
- Members can vote on their own suggestions.
- The button updates right away (optimistic UI, as `UpvoteButton.tsx` does) and the count and voter list update with it.

## Choosing a book (admin)

Our shelf only shows books with status `past`. A new book created through `createBook` becomes `current` (if there's no current book) or `upcoming`. So the chosen book doesn't go straight onto Our shelf. It enters the normal admin flow and reaches Our shelf after the club has read it. That's why the button says **Choose this book** rather than "Move to Our shelf."

**Choose this book**:

1. Asks for the **number of chapters** in a small modal ("How many chapters does *Title* have?"). It's required because `Book.totalChapters` is required.
2. In one transaction:
   - creates a `Book` through the existing `createBook` logic (same current/upcoming rule) with the title and author,
   - sets `blurb` to the synopsis and `genre` to the genre,
   - deletes the Long List book, which removes its votes.
3. Redirects the admin to that book's admin page (`/admin?book=<id>`), the same as `createBookAction` does, so they can add sections, a cover, and so on.

Admin-only, enforced with `requireAdmin()`.

`createBook` in `src/lib/books.ts` currently opens its own transaction. Builder's call: refactor it to accept a transaction client (or pull out an inner helper), so that choosing a book and deleting the suggestion either both happen or neither does.

## Data

New Prisma models (names are the builder's call):

```prisma
model LongListBook {
  id            String   @id @default(cuid())
  title         String
  author        String
  genre         String?  // one of GENRES in src/lib/genres.ts
  synopsis      String
  suggestedById String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Version 2 (Google Books). Empty in version 1.
  googleBooksId String?  @unique
  coverUrl      String?

  suggestedBy User           @relation(fields: [suggestedById], references: [id], onDelete: Cascade)
  votes       LongListVote[]
}

model LongListVote {
  bookId    String
  userId    String
  createdAt DateTime @default(now())

  book LongListBook @relation(fields: [bookId], references: [id], onDelete: Cascade)
  user User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([bookId, userId])
}
```

- These are separate from `Book` because a suggestion has no chapters, sections or reading progress.
- `googleBooksId` is unique so that version 2 can block duplicates reliably. In SQLite, multiple NULLs are allowed under a unique index.
- Deleting a user removes their suggestions and votes (cascade), matching the roadmap tables.

## Code layout

Follow the existing patterns:

- `src/lib/long-list.ts`: database functions (list with sort, get one, create, update, delete, toggle vote, choose). Ownership and admin checks happen here or in the actions, as in `roadmap.ts`.
- `src/lib/long-list-view.ts`: pure helpers (sorting, ranking, summary line, duplicate key) that are easy to unit-test.
- `src/app/long-list/actions.ts`: server actions.
- `src/app/long-list/page.tsx` and `src/app/long-list/[bookId]/page.tsx`.
- `src/components/long-list/`: the components.
- Limits go in `src/lib/limits.ts`.
- Tests go in `tests/lib` and `tests/app`, following the existing tests.

## What's new

When this ships, add a Changelog entry and mark any related roadmap item as shipped, following the What's new deploy steps. At deploy time, check whether 1.3 (`src/lib/changelog.ts`) has gone live yet. If it hasn't, this goes into 1.3. If it has, it goes into a new 1.4. Ask Caryn for the roadmap item number to mark as shipped.

## Version 2 (not in this build): Google Books lookup

For context only. A search box at the top of the Suggest a book form, using a server-side route to the Google Books API so the key stays private. Picking a result fills in title, author, synopsis (shortened to fit 300 characters), cover link and `googleBooksId`, and suggests a genre mapped from Google's categories. The member can change any field, including the genre, before saving. Manual entry remains available.

## Left to the builder

- Exact routes (`/long-list` is a suggestion) and component names.
- How the Bookshelf dropdown and the phone menu group look, within the existing nav styles.
- Exact copy for the empty state, confirmations and placeholders, in PageFolk's warm, plain tone.
- Whether A–Z ignores leading articles.
- Whether to extract a shared list/panel component from `ShelfBrowser` or write a parallel one.
