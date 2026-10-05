# One current book, with an upcoming status — design

Date: 2026-10-04
Status: approved in conversation, pending written-spec review

## Context

A club should have exactly one current book; This month shows it. Today two paths can leave two books current:

- **Mark as current** (`setBookStatus` in `src/lib/books.ts`) flips one book and leaves the existing current book alone.
- **Add a new book** (`createBook`) always creates the book as current.

With two current books, `listBooks('current')[0]` (newest first) silently decides what This month shows. Admins also have
no way to set up next month's book without making it live.

## Decisions

- **Three statuses:** `upcoming`, `current`, `past`. `Book.status` is already a free-text column (default `"current"`),
  so there is no schema change.
- **New books:** `current` when the club has no current book, otherwise `upcoming`.
- **Make current** (offered on upcoming and past books) is one transaction: every other `current` book becomes `past`,
  then this book becomes `current`. This also heals any existing duplicates.
- **Mark as past** (offered on the current book) is unchanged and may leave no current book.
- **No path back to upcoming.** Deleting covers mistakes.
- **Several upcoming books are allowed.**
- **Upcoming books are admin-only.** Members cannot open them by URL or act on them.
- **Make current asks for confirmation when another book is current**, using a native `confirm()` like
  `DeleteBookButton`. With no current book it switches immediately.

## Server

### `src/lib/books.ts`

```ts
export type BookStatus = 'upcoming' | 'current' | 'past'
```

- `createBook(input)`: in a transaction, count `current` books. Create with `status: count === 0 ? 'current' :
  'upcoming'`.
- `makeBookCurrent(bookId)`: in a transaction, `updateMany({ where: { status: 'current', NOT: { id: bookId } },
  data: { status: 'past' } })`, then `update({ where: { id: bookId }, data: { status: 'current' } })`. The return
  value is the updated book.
- `markBookPast(bookId)`: `update` to `past`.
- `setBookStatus` is removed and its callers move to the two functions above.
- `listBooks(status?: BookStatus)` widens its parameter type.

### `src/lib/book-access.ts` (new, pure)

```ts
export function canViewBook(status: string, isAdmin: boolean): boolean // false only for upcoming + non-admin
```

### Admin actions (`src/app/admin/actions.ts`)

- `setBookStatusAction` is replaced by `makeBookCurrentAction(bookId)` and `markBookPastAction(bookId)`. Both call
  `requireAdmin()`, then `revalidateBookPages()`, which also covers `/shelf`; today's status action skips it.

### Member access

- `src/app/shelf/[bookId]/page.tsx`: after loading the view, if `!canViewBook(status, user.isAdmin)`, call
  `notFound()`. `getBookView` returns the book's `status` for this purpose (added to `BookViewData.book`).
- `src/app/sections/[sectionId]/page.tsx`: the section lookup also returns the book's status (`getSectionBook`
  returning `{ bookId, status } | null`, replacing `getSectionBookId`), and it calls `notFound()` when the viewer
  cannot view the book.
- `setProgressAction` (`src/app/sections/actions.ts`): it throws `Not found` when the book is upcoming and the user is
  not an admin. Progress is the only way a member gains thread memberships, and posting requires a membership, so this
  also closes posting on upcoming books.
- This month (current only) and the shelf (past only) already exclude upcoming books and do not change.

## Admin book list (`src/components/AdminBookList.tsx`)

- **Badges:**
  - Current is unchanged (claret fill, dusty-rose border, gold text).
  - Past is unchanged (muted border, mist text).
  - **Upcoming** is new: dashed dusty-rose border, transparent background, dusty-rose text.
- **Buttons:**
  - Upcoming and past books: **Make current**. When another book is current, a submit handler asks
    `confirm('Make "<title>" the current book? "<current title>" will move to the shelf, and every member will see
    "<title>" on This month.')` and cancels the submit if declined. With no current book there is no prompt.
  - The current book: **Mark as past**, unchanged.
- The confirm runs in a small client component, `MakeCurrentButton`, that takes `title`, `currentTitle: string | null`
  and the server action, in the same shape as `DeleteBookButton`.
- `pickAdminBook` (current first, then newest) is unchanged. Book setup works the same for all statuses.

## Testing

- `createBook`: the first book is current; a second book is upcoming while one is current; a new book after the
  current one is marked past is current.
- `makeBookCurrent`: from past and from upcoming; the old current book becomes past; with two current books seeded,
  exactly one current book is left afterwards; upcoming books other than the target stay upcoming.
- `canViewBook`: all three statuses for admin and member.
- Admin actions: both new actions reject non-admins and revalidate `/`, `/admin` and `/shelf`.
- `setProgressAction`: a member is rejected on an upcoming book; an admin is allowed.
- Pages: the shelf book page and the section redirect call `notFound` for a member on an upcoming book. These are page
  components; cover them through `canViewBook` and the data helpers (`getBookView` returning status, `getSectionBook`),
  plus a manual check.
- Existing tests that call `setBookStatus` or expect new books to be current are updated to the new rules.

## Out of scope

- Moving a book back to upcoming.
- Showing upcoming books to members (e.g. "Coming next").
- Auto-filling the read month when a book moves to past.
