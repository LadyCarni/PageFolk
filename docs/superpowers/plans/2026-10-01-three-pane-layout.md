# Three-Pane Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the main page and thread page with the concept's three-pane layout (book / conversations / open thread), add the header with club name and nav, the Members and Our shelf pages, the book blurb, and message bubbles with a growing composer and Starters.

**Architecture:** One server-rendered `BookView` renders all three panes for a given book; the open thread is chosen by `?thread=ID` (sealed or unknown IDs fall back to the default and reveal nothing). All decision logic (default thread, redirects, form rules, textarea height, active nav link) is pure and unit-tested; data additions are a one-row `Club` table and `Book.blurb`; the panes are server components with small client components only where state is needed (reply toggles, composer, scroll-to-bottom, active nav link).

**Tech Stack:** Next.js 14 (app router, server actions), Prisma 5 + SQLite (`prisma db push`), Chakra UI v2, FontAwesome, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-01-three-pane-layout-design.md`

## Global Constraints

- Existing theme tokens only (`src/theme.ts`); no new colors.
- Thread card colors: unlocked regular fill `#2d1d26` (`mulberry`) border `#6b4a5b` (`borderOpen`); unlocked active fill `#3a2230` (`bubbleMine`) border `#d4b06a` (`antiqueGold`); sealed fill `#1d131a` (`sealed`) dashed border `#7a5568` (`borderMuted`).
- Middle-pane line, verbatim: "Threads open once you finish its last chapter. Sealed threads show nothing so no spoilers!"
- The Safe ground pill uses FontAwesome's `faShield` icon and reads "Safe ground: nothing past chapter N".
- The note avatar sits **outside** the bubble. Others' bubbles use `bubbleOther`, the viewer's use `bubbleMine`.
- The composer text area grows up to **6 lines**, then scrolls inside itself; Starters and the send button stay aligned to the bottom of the bar as it grows. Enter inserts a newline; Ctrl/Cmd+Enter or the send button posts; whitespace-only notes cannot be sent.
- "N notes" counts every post in the thread, replies included.
- Club name: trimmed, 1 to 60 characters. Blurb: trimmed, at most 1,000 characters; empty clears it. No "first published" year anywhere.
- Members page shows avatar and name only ("Member" when there is no name): never email, never progress.
- A sealed or unknown `?thread=` is treated as no selection; the sealed-thread guarantee (no title, no posts for a locked section) must hold in the new view.
- Prisma uses `prisma db push` (no migrations folder). After any schema edit run `npx prisma generate`; `npm test` runs `pretest` (`db push --force-reset --skip-generate` on `test.db`). A running dev server must be restarted after `prisma generate` (it caches the old client).
- Pure logic must live in modules that do not import `@/lib/db`, because client components import them (the browser bundle must not pull in Prisma).
- Stage files by explicit path. Never `git add -A` or `git add .`; `bookclub concept.png` in the repo root is untracked on purpose.
- Check the UI with plain `npm run dev`, not `--turbo` (Turbopack shows a genuine hydration error with Chakra/emotion).

## Review Focus

1. **Hostile or odd `?thread=` values** (sealed ID, unknown ID, empty string, repeated parameter): the view shows the default thread (or the empty state), never the requested sealed thread's title or posts. (Task 1 `resolveSelectedThread`, Task 2 `getBookView` tests.)
2. **Club name unset, whitespace-only, or exactly at the 60-character edge:** unset shows no name in the header; whitespace-only is rejected; 60 passes and 61 is rejected. Same shape for the 1,000-character blurb. (Task 1 `limits` tests, Task 2 `club` and `books` tests.)
3. **Members with no name, or many with the same name:** unnamed members sort last and show as "Member"; the member list never exposes `email`. (Task 2 `members` tests.)
4. **Composer input:** whitespace-only notes are never sent; the text area stops growing at exactly 6 lines and then scrolls; a Starter chosen into a non-empty box is appended on a new line, not overwriting it. (Task 1 `composer` tests; whitespace guard in `NoteComposer` code.)
5. **A reader with no open threads, or a book with no threads:** the right pane shows its empty state and the middle pane its message; nothing crashes. (Task 2 `getBookView` tests; Task 7 empty states.)
6. **Old links and book switching:** `/sections/ID` for a current-book thread goes to `/?thread=ID`, for a past book to `/shelf/BOOK?thread=ID`; `/shelf/BOOK` for the current book redirects to `/`. (Task 1 `threadHref`/`bookPath` tests; Task 7 redirect code.)

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/limits.ts` (new) | Club-name and blurb limits and validators (pure) |
| `src/lib/threads.ts` (new) | `pickDefaultThread`, `resolveSelectedThread`, `threadHref`, `bookPath` (pure) |
| `src/lib/nav.ts` (new) | `activeNavHref(pathname)` (pure) |
| `src/lib/composer.ts` (new) | `computeTextareaHeight`, `appendStarter` (pure) |
| `src/lib/prompts.ts` (new) | `STARTER_PROMPTS` (moved from the prompt card) |
| `src/lib/layout.ts` (new) | `NAV_HEIGHT_PX` |
| `src/lib/chapters.ts` (modify) | `validateFormValues` gains `clubName` and `blurb` rules |
| `src/lib/club.ts` (new) | `getClubName`, `setClubName` |
| `src/lib/members.ts` (new) | `listMembers` |
| `src/lib/book-view.ts` (new) | `getBookView` loader for the three panes |
| `src/lib/books.ts`, `src/lib/sections.ts` (modify) | `setBlurb`; `getSectionBookId`; thread result gains `title`, `startChapter`, `endChapter` |
| `prisma/schema.prisma` (modify) | `Club` model, `Book.blurb` |
| `src/app/admin/actions.ts`, `src/app/admin/page.tsx`, `src/components/AdminForm.tsx` (modify) | Club name and blurb forms; text-area support |
| `src/components/CoverImage.tsx`, `BookPanel.tsx` (new) | Left pane |
| `src/components/ThreadCard.tsx`, `ThreadList.tsx` (new) | Middle pane |
| `src/components/ThreadPane.tsx`, `NoteItem.tsx`, `NoteActions.tsx`, `NoteComposer.tsx`, `MessagesScroller.tsx` (new) | Right pane |
| `src/components/BookView.tsx` (new) | Grid of the three panes |
| `src/app/page.tsx`, `src/app/shelf/page.tsx`, `src/app/shelf/[bookId]/page.tsx`, `src/app/members/page.tsx` (new/modify) | Routes |
| `src/app/sections/[sectionId]/page.tsx`, `src/app/past-books/page.tsx` (modify) | Become redirects |
| `src/components/NavBar.tsx`, `NavLinks.tsx`, `src/app/layout.tsx` (modify/new) | Header |
| `src/components/DiscussionPromptCard.tsx`, `SectionRow.tsx`, `PostForm.tsx`, `SectionActivity.tsx` (delete) | Replaced |

---

### Task 1: Pure logic (limits, thread selection, nav, composer helpers, form rules)

**Files:**
- Create: `src/lib/limits.ts`, `src/lib/threads.ts`, `src/lib/nav.ts`, `src/lib/composer.ts`, `src/lib/prompts.ts`
- Modify: `src/lib/chapters.ts`
- Test: `tests/lib/limits.test.ts`, `tests/lib/threads.test.ts`, `tests/lib/nav.test.ts`, `tests/lib/composer.test.ts`, `tests/lib/chapters.test.ts`

**Interfaces:**
- Produces:
  - `CLUB_NAME_MAX = 60`, `BLURB_MAX = 1000`, `validateClubName(name: string): string | null`, `validateBlurb(text: string): string | null`
  - `pickDefaultThread(sections: SectionSummary[]): string | null`
  - `resolveSelectedThread(sections: SectionSummary[], requestedId: string | undefined): { selectedId: string | null; explicit: boolean }`
  - `bookPath(bookId: string, currentBookId: string | null): string`; `threadHref(bookId: string, currentBookId: string | null, threadId: string): string`
  - `type NavHref = '/' | '/shelf' | '/members' | '/admin'`; `activeNavHref(pathname: string): NavHref | null`
  - `computeTextareaHeight(input: { scrollHeight: number; lineHeight: number; paddingSpace: number; borderSpace: number; maxLines: number }): { height: number; scroll: boolean }`; `appendStarter(current: string, prompt: string): string`
  - `STARTER_PROMPTS: string[]`
  - `FormRule` gains `{ kind: 'clubName' }` and `{ kind: 'blurb' }`; `validateFormValues` handles them from `values.clubName` / `values.blurb`.

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/limits.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { BLURB_MAX, CLUB_NAME_MAX, validateBlurb, validateClubName } from '@/lib/limits'

describe('validateClubName', () => {
  it('accepts a normal name, counting characters after trimming', () => {
    expect(validateClubName('The Thursday Readers')).toBeNull()
    expect(validateClubName('  x  ')).toBeNull()
  })

  it('rejects blank and whitespace-only names', () => {
    expect(validateClubName('')).toBe('Club name is required')
    expect(validateClubName('   ')).toBe('Club name is required')
  })

  it('accepts exactly 60 characters and rejects 61', () => {
    expect(CLUB_NAME_MAX).toBe(60)
    expect(validateClubName('a'.repeat(60))).toBeNull()
    expect(validateClubName('a'.repeat(61))).toBe('Club name must be 60 characters or fewer')
  })
})

describe('validateBlurb', () => {
  it('accepts empty and whitespace-only text (they clear the blurb)', () => {
    expect(validateBlurb('')).toBeNull()
    expect(validateBlurb('   ')).toBeNull()
  })

  it('accepts exactly 1000 characters and rejects 1001, ignoring surrounding whitespace', () => {
    expect(BLURB_MAX).toBe(1000)
    expect(validateBlurb('a'.repeat(1000))).toBeNull()
    expect(validateBlurb(`  ${'a'.repeat(1000)}  `)).toBeNull()
    expect(validateBlurb('a'.repeat(1001))).toBe('Blurb must be 1000 characters or fewer')
  })
})
```

Create `tests/lib/threads.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { bookPath, pickDefaultThread, resolveSelectedThread, threadHref } from '@/lib/threads'
import type { SectionSummary } from '@/lib/sections'

const open = (id: string, order: number): SectionSummary => ({
  id,
  order,
  status: 'unlocked',
  startChapter: order * 5 - 4,
  endChapter: order * 5,
  title: null,
  postCount: 0,
  lastPostAt: null,
})
const sealed = (id: string, order: number): SectionSummary => ({
  id,
  order,
  status: 'locked',
  startChapter: order * 5 - 4,
  endChapter: order * 5,
  chaptersToGo: 3,
})

describe('pickDefaultThread', () => {
  it('picks the open thread with the highest order, wherever it sits in the list', () => {
    expect(pickDefaultThread([open('b', 2), open('a', 1), sealed('c', 3)])).toBe('b')
  })

  it('ignores sealed threads, even ones with a higher order', () => {
    expect(pickDefaultThread([open('a', 1), sealed('z', 9)])).toBe('a')
  })

  it('returns null when nothing is open, or there are no threads', () => {
    expect(pickDefaultThread([sealed('a', 1)])).toBeNull()
    expect(pickDefaultThread([])).toBeNull()
  })
})

describe('resolveSelectedThread', () => {
  const sections = [open('a', 1), open('b', 2), sealed('c', 3)]

  it('selects a requested open thread and marks it explicit', () => {
    expect(resolveSelectedThread(sections, 'a')).toEqual({ selectedId: 'a', explicit: true })
  })

  it('treats a requested sealed thread as no selection, falling back to the default', () => {
    expect(resolveSelectedThread(sections, 'c')).toEqual({ selectedId: 'b', explicit: false })
  })

  it('treats unknown, empty and missing requests as no selection', () => {
    expect(resolveSelectedThread(sections, 'nope')).toEqual({ selectedId: 'b', explicit: false })
    expect(resolveSelectedThread(sections, '')).toEqual({ selectedId: 'b', explicit: false })
    expect(resolveSelectedThread(sections, undefined)).toEqual({ selectedId: 'b', explicit: false })
  })

  it('selects nothing when no thread is open', () => {
    expect(resolveSelectedThread([sealed('a', 1)], 'a')).toEqual({ selectedId: null, explicit: false })
  })
})

describe('bookPath and threadHref', () => {
  it('uses / for the current book and /shelf/ID for any other', () => {
    expect(bookPath('b1', 'b1')).toBe('/')
    expect(bookPath('b2', 'b1')).toBe('/shelf/b2')
    expect(bookPath('b2', null)).toBe('/shelf/b2')
  })

  it('builds thread links on the right base, encoding the id', () => {
    expect(threadHref('b1', 'b1', 's1')).toBe('/?thread=s1')
    expect(threadHref('b2', 'b1', 's1')).toBe('/shelf/b2?thread=s1')
    expect(threadHref('b2', 'b1', 'a b')).toBe('/shelf/b2?thread=a%20b')
  })
})
```

Create `tests/lib/nav.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { activeNavHref } from '@/lib/nav'

describe('activeNavHref', () => {
  it('maps each section of the app to its nav link', () => {
    expect(activeNavHref('/')).toBe('/')
    expect(activeNavHref('/shelf')).toBe('/shelf')
    expect(activeNavHref('/shelf/abc123')).toBe('/shelf')
    expect(activeNavHref('/members')).toBe('/members')
    expect(activeNavHref('/admin')).toBe('/admin')
    expect(activeNavHref('/admin/allowed-emails')).toBe('/admin')
  })

  it('does not match look-alike paths', () => {
    expect(activeNavHref('/shelfy')).toBeNull()
    expect(activeNavHref('/membership')).toBeNull()
    expect(activeNavHref('/sign-in')).toBeNull()
  })
})
```

Create `tests/lib/composer.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { appendStarter, computeTextareaHeight } from '@/lib/composer'

// A 24px line with 16px of padding and 2px of border.
const base = { lineHeight: 24, paddingSpace: 16, borderSpace: 2, maxLines: 6 }

describe('computeTextareaHeight', () => {
  it('fits one line without scrolling', () => {
    expect(computeTextareaHeight({ ...base, scrollHeight: 40 })).toEqual({ height: 42, scroll: false })
  })

  it('grows with the content up to exactly six lines', () => {
    expect(computeTextareaHeight({ ...base, scrollHeight: 16 + 24 * 6 })).toEqual({ height: 162, scroll: false })
  })

  it('stops at six lines and scrolls beyond that', () => {
    expect(computeTextareaHeight({ ...base, scrollHeight: 16 + 24 * 7 })).toEqual({ height: 162, scroll: true })
    expect(computeTextareaHeight({ ...base, scrollHeight: 16 + 24 * 40 })).toEqual({ height: 162, scroll: true })
  })
})

describe('appendStarter', () => {
  it('fills an empty or whitespace-only box with the prompt', () => {
    expect(appendStarter('', 'Who is your favorite?')).toBe('Who is your favorite?')
    expect(appendStarter('  \n ', 'Who is your favorite?')).toBe('Who is your favorite?')
  })

  it('appends to existing text on a new line instead of overwriting it', () => {
    expect(appendStarter('My thoughts so far.', 'Who is your favorite?')).toBe(
      'My thoughts so far.\nWho is your favorite?'
    )
    expect(appendStarter('Trailing space \n', 'Q?')).toBe('Trailing space\nQ?')
  })
})
```

Append to the end of `tests/lib/chapters.test.ts`:

```ts

describe('validateFormValues: club name and blurb rules', () => {
  it('checks the club name', () => {
    expect(validateFormValues({ kind: 'clubName' }, { clubName: 'The Thursday Readers' })).toBeNull()
    expect(validateFormValues({ kind: 'clubName' }, { clubName: '   ' })).toBe('Club name is required')
    expect(validateFormValues({ kind: 'clubName' }, { clubName: 'a'.repeat(61) })).toBe(
      'Club name must be 60 characters or fewer'
    )
    expect(validateFormValues({ kind: 'clubName' }, {})).toBe('Club name is required')
  })

  it('checks the blurb, allowing it to be empty', () => {
    expect(validateFormValues({ kind: 'blurb' }, { blurb: '' })).toBeNull()
    expect(validateFormValues({ kind: 'blurb' }, {})).toBeNull()
    expect(validateFormValues({ kind: 'blurb' }, { blurb: 'a'.repeat(1001) })).toBe(
      'Blurb must be 1000 characters or fewer'
    )
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/lib/limits.test.ts tests/lib/threads.test.ts tests/lib/nav.test.ts tests/lib/composer.test.ts tests/lib/chapters.test.ts`
Expected: FAIL (modules `@/lib/limits`, `@/lib/threads`, `@/lib/nav`, `@/lib/composer` cannot be resolved; the new `chapters` tests fail on the missing rule kinds).

- [ ] **Step 3: Write the implementation**

Create `src/lib/limits.ts`:

```ts
export const CLUB_NAME_MAX = 60
export const BLURB_MAX = 1000

export function validateClubName(name: string): string | null {
  const trimmed = name.trim()
  if (!trimmed) return 'Club name is required'
  if (trimmed.length > CLUB_NAME_MAX) return `Club name must be ${CLUB_NAME_MAX} characters or fewer`
  return null
}

// An empty (or whitespace-only) blurb is valid: saving it clears the blurb.
export function validateBlurb(text: string): string | null {
  return text.trim().length > BLURB_MAX ? `Blurb must be ${BLURB_MAX} characters or fewer` : null
}
```

Create `src/lib/threads.ts`:

```ts
import type { SectionSummary } from '@/lib/sections'

// The open thread with the highest order, i.e. the latest chapters the reader has unlocked.
export function pickDefaultThread(sections: SectionSummary[]): string | null {
  let best: SectionSummary | null = null
  for (const section of sections) {
    if (section.status === 'unlocked' && (!best || section.order > best.order)) best = section
  }
  return best?.id ?? null
}

// A requested thread counts only if it is open. Sealed, unknown and empty requests fall back
// to the default and are not "explicit", so a sealed thread's existence is never confirmed.
export function resolveSelectedThread(
  sections: SectionSummary[],
  requestedId: string | undefined
): { selectedId: string | null; explicit: boolean } {
  const requested = requestedId
    ? sections.find((section) => section.id === requestedId && section.status === 'unlocked')
    : undefined
  if (requested) return { selectedId: requested.id, explicit: true }
  return { selectedId: pickDefaultThread(sections), explicit: false }
}

export function bookPath(bookId: string, currentBookId: string | null): string {
  return bookId === currentBookId ? '/' : `/shelf/${bookId}`
}

export function threadHref(bookId: string, currentBookId: string | null, threadId: string): string {
  return `${bookPath(bookId, currentBookId)}?thread=${encodeURIComponent(threadId)}`
}
```

Create `src/lib/nav.ts`:

```ts
export type NavHref = '/' | '/shelf' | '/members' | '/admin'

export function activeNavHref(pathname: string): NavHref | null {
  const within = (base: string) => pathname === base || pathname.startsWith(`${base}/`)
  if (pathname === '/') return '/'
  if (within('/shelf')) return '/shelf'
  if (within('/members')) return '/members'
  if (within('/admin')) return '/admin'
  return null
}
```

Create `src/lib/composer.ts`:

```ts
// Height for the note text area: it grows with its content up to maxLines, then scrolls.
// `scrollHeight` excludes borders, so they are added back; padding is already inside it.
export function computeTextareaHeight(input: {
  scrollHeight: number
  lineHeight: number
  paddingSpace: number
  borderSpace: number
  maxLines: number
}): { height: number; scroll: boolean } {
  const maxHeight = input.maxLines * input.lineHeight + input.paddingSpace + input.borderSpace
  const wanted = input.scrollHeight + input.borderSpace
  // One pixel of tolerance so sub-pixel rounding never makes an exactly-full box scroll.
  return wanted > maxHeight + 1 ? { height: maxHeight, scroll: true } : { height: wanted, scroll: false }
}

export function appendStarter(current: string, prompt: string): string {
  const existing = current.replace(/\s+$/, '')
  return existing === '' ? prompt : `${existing}\n${prompt}`
}
```

Create `src/lib/prompts.ts`:

```ts
export const STARTER_PROMPTS = [
  'Who is your favorite character so far and why?',
  'Which character did you relate to or empathize with the most and why?',
  'What was the most memorable or shocking scene or twist in the story and why?',
  'How did this section speed up, slow down, or change the vibe of the story for you?',
  'What choice did the main character make in these chapters, and would you have done the same thing?',
  'Whose perspective or motives do you still feel unsure about right now?',
  'Where did you feel the most tension or suspense while reading this section?',
]
```

In `src/lib/chapters.ts`, add the import at the top:

```ts
import { validateBlurb, validateClubName } from '@/lib/limits'
```

Change the `FormRule` type to:

```ts
export type FormRule =
  | { kind: 'section'; totalChapters: number; others: OtherSection[]; ignoreId?: string }
  | { kind: 'total'; minTotal: number }
  | { kind: 'newBook' }
  | { kind: 'clubName' }
  | { kind: 'blurb' }
```

In `validateFormValues`, insert these two branches right before the final `newBook` handling (before the line `if (!values.title?.trim() || !values.author?.trim()) {`):

```ts
  if (rule.kind === 'clubName') {
    return validateClubName(values.clubName ?? '')
  }

  if (rule.kind === 'blurb') {
    return validateBlurb(values.blurb ?? '')
  }

```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/lib/limits.test.ts tests/lib/threads.test.ts tests/lib/nav.test.ts tests/lib/composer.test.ts tests/lib/chapters.test.ts`
Expected: PASS (all tests). Then `npx tsc --noEmit`: expect no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/limits.ts src/lib/threads.ts src/lib/nav.ts src/lib/composer.ts src/lib/prompts.ts src/lib/chapters.ts tests/lib/limits.test.ts tests/lib/threads.test.ts tests/lib/nav.test.ts tests/lib/composer.test.ts tests/lib/chapters.test.ts
git commit -m "feat: pure logic for thread selection, nav, composer and club/blurb rules"
```

---

### Task 2: Data layer (Club, blurb, members, thread fields, book-view loader)

**Files:**
- Modify: `prisma/schema.prisma`, `src/lib/books.ts`, `src/lib/sections.ts`
- Create: `src/lib/club.ts`, `src/lib/members.ts`, `src/lib/book-view.ts`
- Test: `tests/lib/club.test.ts`, `tests/lib/members.test.ts`, `tests/lib/book-view.test.ts`, `tests/lib/books.test.ts`, `tests/lib/sections.test.ts`

**Interfaces:**
- Consumes (Task 1): `validateClubName`, `validateBlurb`, `resolveSelectedThread`.
- Produces:
  - `getClubName(): Promise<string | null>`; `setClubName(name: string): Promise<void>` (throws `ValidationError`)
  - `setBlurb(bookId: string, text: string)` in `books.ts` (throws `ValidationError`)
  - `listMembers(): Promise<{ id: string; name: string | null }[]>`
  - `getSectionBookId(sectionId: string): Promise<string | null>`
  - `ThreadResult` unlocked variant: `{ status: 'unlocked'; name: string; title: string | null; startChapter: number; endChapter: number; posts: PostWithAuthor[] }`
  - `type BookViewData = { book: { id; title; author; blurb: string | null; totalChapters: number; coverVersion: number | null }; finished: number; sections: SectionSummary[]; selectedId: string | null; explicit: boolean; thread: Extract<ThreadResult, { status: 'unlocked' }> | null }`
  - `getBookView(bookId: string, userId: string, requestedThreadId?: string): Promise<BookViewData | null>`

- [ ] **Step 1: Edit the schema and regenerate**

In `prisma/schema.prisma`, add a `blurb` field to `model Book`, right after `totalChapters Int`:

```prisma
  blurb         String?
```

Add this model at the end of the file:

```prisma
model Club {
  id   Int    @id @default(1)
  name String
}
```

Run: `npx prisma format && npx prisma generate`
Expected: "Generated Prisma Client".

- [ ] **Step 2: Write the failing tests**

Create `tests/lib/club.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { getClubName, setClubName } from '@/lib/club'
import { ValidationError } from '@/lib/errors'

describe('club name', () => {
  beforeEach(async () => {
    await prisma.club.deleteMany()
  })

  it('is null until it has been set', async () => {
    expect(await getClubName()).toBeNull()
  })

  it('stores the trimmed name', async () => {
    await setClubName('  The Thursday Readers  ')
    expect(await getClubName()).toBe('The Thursday Readers')
  })

  it('replaces the name and keeps a single row', async () => {
    await setClubName('First')
    await setClubName('Second')
    expect(await getClubName()).toBe('Second')
    expect(await prisma.club.count()).toBe(1)
  })

  it('rejects blank, whitespace-only and over-long names without changing the stored one', async () => {
    await setClubName('Keep me')
    await expect(setClubName('')).rejects.toBeInstanceOf(ValidationError)
    await expect(setClubName('   ')).rejects.toThrow('Club name is required')
    await expect(setClubName('a'.repeat(61))).rejects.toThrow('60 characters or fewer')
    expect(await getClubName()).toBe('Keep me')
  })

  it('accepts a name of exactly 60 characters', async () => {
    await setClubName('a'.repeat(60))
    expect(await getClubName()).toBe('a'.repeat(60))
  })
})
```

Create `tests/lib/members.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { listMembers } from '@/lib/members'

describe('listMembers', () => {
  beforeEach(async () => {
    await prisma.readingProgress.deleteMany()
    await prisma.post.deleteMany()
    await prisma.threadMembership.deleteMany()
    await prisma.user.deleteMany()
  })

  it('lists named members alphabetically (ignoring case), then unnamed ones', async () => {
    await prisma.user.create({ data: { googleId: 'g1', email: 'z@example.com', name: 'zed' } })
    await prisma.user.create({ data: { googleId: 'g2', email: 'n@example.com' } })
    await prisma.user.create({ data: { googleId: 'g3', email: 'a@example.com', name: 'Amy' } })
    await prisma.user.create({ data: { googleId: 'g4', email: 'b@example.com', name: 'bob' } })

    const members = await listMembers()

    expect(members.map((m) => m.name)).toEqual(['Amy', 'bob', 'zed', null])
  })

  it('returns only id and name: never an email or anything else', async () => {
    await prisma.user.create({ data: { googleId: 'g5', email: 'secret@example.com', name: 'Amy', avatarUrl: 'x' } })

    const [member] = await listMembers()

    expect(Object.keys(member).sort()).toEqual(['id', 'name'])
    expect(JSON.stringify(member)).not.toContain('secret@example.com')
  })

  it('returns an empty list when nobody has signed in', async () => {
    expect(await listMembers()).toEqual([])
  })
})
```

Create `tests/lib/book-view.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { getBookView } from '@/lib/book-view'

async function setup() {
  const book = await prisma.book.create({
    data: {
      title: 'Jane Eyre',
      author: 'Charlotte Brontë',
      blurb: 'An orphaned girl.',
      totalChapters: 38,
      sections: {
        create: [
          { startChapter: 1, endChapter: 5, order: 1, title: 'Gateshead' },
          { startChapter: 6, endChapter: 10, order: 2, title: 'Lowood' },
          { startChapter: 11, endChapter: 15, order: 3, title: 'Thornfield' },
        ],
      },
    },
    include: { sections: { orderBy: { order: 'asc' } } },
  })
  const user = await prisma.user.create({ data: { googleId: 'g-bv', email: 'bv@example.com', name: 'Reader' } })
  return { book, user, ids: book.sections.map((s) => s.id) }
}

async function unlock(userId: string, sectionId: string) {
  await prisma.threadMembership.create({ data: { userId, sectionId } })
}

describe('getBookView', () => {
  beforeEach(async () => {
    await prisma.readingProgress.deleteMany()
    await prisma.post.deleteMany()
    await prisma.threadMembership.deleteMany()
    await prisma.bookCover.deleteMany()
    await prisma.section.deleteMany()
    await prisma.book.deleteMany()
    await prisma.user.deleteMany()
  })

  it('returns null for an unknown book', async () => {
    const { user } = await setup()
    expect(await getBookView('nope', user.id)).toBeNull()
  })

  it('returns the book details, blurb and progress', async () => {
    const { book, user } = await setup()
    await prisma.readingProgress.create({ data: { userId: user.id, bookId: book.id, chaptersFinished: 12 } })

    const data = await getBookView(book.id, user.id)

    expect(data?.book).toEqual({
      id: book.id,
      title: 'Jane Eyre',
      author: 'Charlotte Brontë',
      blurb: 'An orphaned girl.',
      totalChapters: 38,
      coverVersion: null,
    })
    expect(data?.finished).toBe(12)
    expect(data?.sections).toHaveLength(3)
  })

  it('reports a cover version when the book has a cover', async () => {
    const { book, user } = await setup()
    const cover = await prisma.bookCover.create({
      data: { bookId: book.id, data: Buffer.from([1, 2, 3]), contentType: 'image/png' },
    })

    const data = await getBookView(book.id, user.id)

    expect(data?.book.coverVersion).toBe(cover.updatedAt.getTime())
  })

  it('defaults to the open thread with the highest order, not explicit', async () => {
    const { book, user, ids } = await setup()
    await unlock(user.id, ids[0])
    await unlock(user.id, ids[1])

    const data = await getBookView(book.id, user.id)

    expect(data?.selectedId).toBe(ids[1])
    expect(data?.explicit).toBe(false)
    expect(data?.thread?.title).toBe('Lowood')
    expect(data?.thread).toMatchObject({ startChapter: 6, endChapter: 10 })
  })

  it('selects a requested open thread and marks it explicit', async () => {
    const { book, user, ids } = await setup()
    await unlock(user.id, ids[0])
    await unlock(user.id, ids[1])

    const data = await getBookView(book.id, user.id, ids[0])

    expect(data?.selectedId).toBe(ids[0])
    expect(data?.explicit).toBe(true)
    expect(data?.thread?.title).toBe('Gateshead')
  })

  it('ignores a requested sealed thread and reveals nothing about it', async () => {
    const { book, user, ids } = await setup()
    await unlock(user.id, ids[0])
    await unlock(user.id, ids[1])
    const author = await prisma.user.create({ data: { googleId: 'g-a', email: 'a@example.com' } })
    await prisma.post.create({ data: { sectionId: ids[2], userId: author.id, body: 'Secret ending' } })

    const data = await getBookView(book.id, user.id, ids[2])

    expect(data?.selectedId).toBe(ids[1])
    expect(data?.explicit).toBe(false)
    const text = JSON.stringify(data)
    expect(text).not.toContain('Thornfield')
    expect(text).not.toContain('Secret ending')
  })

  it('ignores an unknown thread id', async () => {
    const { book, user, ids } = await setup()
    await unlock(user.id, ids[0])

    const data = await getBookView(book.id, user.id, 'does-not-exist')

    expect(data?.selectedId).toBe(ids[0])
    expect(data?.explicit).toBe(false)
  })

  it('selects nothing, with no thread, when the reader has no open threads', async () => {
    const { book, user } = await setup()

    const data = await getBookView(book.id, user.id)

    expect(data?.selectedId).toBeNull()
    expect(data?.thread).toBeNull()
    expect(data?.sections.every((s) => s.status === 'locked')).toBe(true)
  })

  it('works for a book with no threads at all', async () => {
    const book = await prisma.book.create({ data: { title: 'Empty', author: 'Nobody', totalChapters: 10 } })
    const user = await prisma.user.create({ data: { googleId: 'g-e', email: 'e@example.com' } })

    const data = await getBookView(book.id, user.id)

    expect(data?.sections).toEqual([])
    expect(data?.selectedId).toBeNull()
  })
})
```

Append to `tests/lib/books.test.ts`, inside the `describe('books', ...)` block (before its final closing `})`), after importing `setBlurb` by adding it to the existing `import { ... } from '@/lib/books'` list:

```ts

  it('sets a trimmed blurb and clears it with empty text', async () => {
    const book = await newBook()

    await setBlurb(book.id, '  An orphaned girl.  ')
    expect((await prisma.book.findUniqueOrThrow({ where: { id: book.id } })).blurb).toBe('An orphaned girl.')

    await setBlurb(book.id, '   ')
    expect((await prisma.book.findUniqueOrThrow({ where: { id: book.id } })).blurb).toBeNull()
  })

  it('accepts a blurb of exactly 1000 characters and rejects 1001, leaving the blurb unchanged', async () => {
    const book = await newBook()
    await setBlurb(book.id, 'a'.repeat(1000))

    await expect(setBlurb(book.id, 'b'.repeat(1001))).rejects.toBeInstanceOf(ValidationError)

    expect((await prisma.book.findUniqueOrThrow({ where: { id: book.id } })).blurb).toBe('a'.repeat(1000))
  })
```

In `tests/lib/sections.test.ts`: add `getSectionBookId` to the import from `@/lib/sections`; in the test `returns the display name and posts once the thread is unlocked`, add these expectations inside the `if (result.status === 'unlocked')` block:

```ts
      expect(result.title).toBe('Lowood')
      expect(result.startChapter).toBe(6)
      expect(result.endChapter).toBe(10)
```

and add this test at the end of the `describe('getSectionThread', ...)` block:

```ts

  it('finds the book a section belongs to, or null when it does not exist', async () => {
    const sectionId = await setup()
    const section = await prisma.section.findUniqueOrThrow({ where: { id: sectionId } })

    expect(await getSectionBookId(sectionId)).toBe(section.bookId)
    expect(await getSectionBookId('does-not-exist')).toBeNull()
  })
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test -- tests/lib/club.test.ts tests/lib/members.test.ts tests/lib/book-view.test.ts tests/lib/books.test.ts tests/lib/sections.test.ts`
Expected: FAIL (`@/lib/club`, `@/lib/members`, `@/lib/book-view` cannot be resolved; `setBlurb` and `getSectionBookId` are not exported; the thread result lacks `title`).

- [ ] **Step 4: Write the implementation**

Create `src/lib/club.ts`:

```ts
import { prisma } from '@/lib/db'
import { ValidationError } from '@/lib/errors'
import { validateClubName } from '@/lib/limits'

// There is only ever one club, stored as the row with id 1.
const CLUB_ID = 1

export async function getClubName(): Promise<string | null> {
  const club = await prisma.club.findUnique({ where: { id: CLUB_ID } })
  return club?.name ?? null
}

export async function setClubName(name: string): Promise<void> {
  const problem = validateClubName(name)
  if (problem) throw new ValidationError(problem)
  const trimmed = name.trim()
  await prisma.club.upsert({
    where: { id: CLUB_ID },
    update: { name: trimmed },
    create: { id: CLUB_ID, name: trimmed },
  })
}
```

Create `src/lib/members.ts`:

```ts
import { prisma } from '@/lib/db'

// Only id and name are selected: emails and progress never leave the database from here.
export async function listMembers(): Promise<{ id: string; name: string | null }[]> {
  const users = await prisma.user.findMany({ select: { id: true, name: true } })
  return users.sort((a, b) => {
    if (a.name === null || b.name === null) {
      if (a.name === b.name) return a.id.localeCompare(b.id)
      return a.name === null ? 1 : -1
    }
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) || a.id.localeCompare(b.id)
  })
}
```

In `src/lib/books.ts`, add `validateBlurb` to the imports (a new line `import { validateBlurb } from '@/lib/limits'`) and add this function after `updateTotalChapters`:

```ts
export async function setBlurb(bookId: string, text: string) {
  const problem = validateBlurb(text)
  if (problem) throw new ValidationError(problem)
  const trimmed = text.trim()
  return prisma.book.update({ where: { id: bookId }, data: { blurb: trimmed === '' ? null : trimmed } })
}
```

In `src/lib/sections.ts`, change the unlocked variant of `ThreadResult` to:

```ts
export type ThreadResult =
  | { status: 'locked' }
  | {
      status: 'unlocked'
      name: string
      title: string | null
      startChapter: number
      endChapter: number
      posts: PostWithAuthor[]
    }
```

Change the final return of `getSectionThread` to:

```ts
  return {
    status: 'unlocked',
    name: sectionDisplayName(section),
    title: section.title,
    startChapter: section.startChapter,
    endChapter: section.endChapter,
    posts,
  }
```

Add at the end of `src/lib/sections.ts`:

```ts

export async function getSectionBookId(sectionId: string): Promise<string | null> {
  const section = await prisma.section.findUnique({ where: { id: sectionId }, select: { bookId: true } })
  return section?.bookId ?? null
}
```

Create `src/lib/book-view.ts`:

```ts
import { prisma } from '@/lib/db'
import { getProgress } from '@/lib/progress'
import { getSectionsForViewer, getSectionThread, type SectionSummary, type ThreadResult } from '@/lib/sections'
import { resolveSelectedThread } from '@/lib/threads'

export type BookViewData = {
  book: {
    id: string
    title: string
    author: string
    blurb: string | null
    totalChapters: number
    coverVersion: number | null
  }
  finished: number
  sections: SectionSummary[]
  selectedId: string | null
  explicit: boolean
  thread: Extract<ThreadResult, { status: 'unlocked' }> | null
}

// Everything the three panes need for one book, in one pass. A sealed or unknown requested
// thread falls back to the default selection and contributes nothing to the result.
export async function getBookView(
  bookId: string,
  userId: string,
  requestedThreadId?: string
): Promise<BookViewData | null> {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    include: { cover: { select: { updatedAt: true } } },
  })
  if (!book) return null

  const [finished, sections] = await Promise.all([
    getProgress(userId, bookId),
    getSectionsForViewer(bookId, userId),
  ])
  const { selectedId, explicit } = resolveSelectedThread(sections, requestedThreadId)

  let thread: BookViewData['thread'] = null
  if (selectedId) {
    const result = await getSectionThread(selectedId, userId)
    if (result.status === 'unlocked') thread = result
  }

  return {
    book: {
      id: book.id,
      title: book.title,
      author: book.author,
      blurb: book.blurb,
      totalChapters: book.totalChapters,
      coverVersion: book.cover?.updatedAt.getTime() ?? null,
    },
    finished,
    sections,
    selectedId: thread ? selectedId : null,
    explicit: thread ? explicit : false,
    thread,
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS for every test file (including the existing admin, sections, progress and sealed-thread tests).
Then: `npx tsc --noEmit`. Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma src/lib/club.ts src/lib/members.ts src/lib/book-view.ts src/lib/books.ts src/lib/sections.ts tests/lib/club.test.ts tests/lib/members.test.ts tests/lib/book-view.test.ts tests/lib/books.test.ts tests/lib/sections.test.ts
git commit -m "feat: club name, book blurb, members list and the book-view loader"
```

---

### Task 3: Admin forms for club name and blurb

**Files:**
- Modify: `src/app/admin/actions.ts`, `src/app/admin/page.tsx`, `src/components/AdminForm.tsx`
- Test: `tests/app/admin-actions.test.ts`

**Interfaces:**
- Consumes (Task 2): `setClubName`, `getClubName`, `setBlurb`; (Task 1) `FormRule` kinds `clubName` and `blurb`.
- Produces: `updateClubNameAction(formData: FormData): Promise<FormResult>` (field `clubName`); `updateBlurbAction(formData: FormData): Promise<FormResult>` (fields `bookId`, `blurb`).

- [ ] **Step 1: Write the failing tests**

In `tests/app/admin-actions.test.ts`: add `updateClubNameAction, updateBlurbAction` to the import from `@/app/admin/actions`; add `import { getClubName } from '@/lib/club'`; add `await prisma.club.deleteMany()` as a line in the top-level `beforeEach`; then add these tests inside the top-level `describe('admin actions', ...)` block (after the `updateTotalChaptersAction` test, using the existing `sectionForm` helper):

```ts

  it('rejects updateClubNameAction for a non-admin', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Forbidden: admin only'))
    await expect(updateClubNameAction(sectionForm({ clubName: 'The Thursday Readers' }))).rejects.toThrow('Forbidden')
    expect(await getClubName()).toBeNull()
  })

  it('sets the club name for an admin, and reports blank or over-long names without saving', async () => {
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })

    expect(await updateClubNameAction(sectionForm({ clubName: ' The Thursday Readers ' }))).toEqual({})
    expect(await getClubName()).toBe('The Thursday Readers')

    expect(await updateClubNameAction(sectionForm({ clubName: '   ' }))).toEqual({ error: 'Club name is required' })
    expect((await updateClubNameAction(sectionForm({ clubName: 'a'.repeat(61) }))).error).toContain('60 characters')
    expect(await getClubName()).toBe('The Thursday Readers')
  })

  it('rejects updateBlurbAction for a non-admin', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Forbidden: admin only'))
    await expect(updateBlurbAction(sectionForm({ bookId: 'whatever', blurb: 'x' }))).rejects.toThrow('Forbidden')
  })

  it('sets and clears a blurb for an admin, and reports an over-long one without saving', async () => {
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert', totalChapters: 30 })

    expect(await updateBlurbAction(sectionForm({ bookId: book.id, blurb: 'A desert planet.' }))).toEqual({})
    expect((await prisma.book.findUniqueOrThrow({ where: { id: book.id } })).blurb).toBe('A desert planet.')

    const tooLong = await updateBlurbAction(sectionForm({ bookId: book.id, blurb: 'a'.repeat(1001) }))
    expect(tooLong.error).toContain('1000 characters')
    expect((await prisma.book.findUniqueOrThrow({ where: { id: book.id } })).blurb).toBe('A desert planet.')

    expect(await updateBlurbAction(sectionForm({ bookId: book.id, blurb: '' }))).toEqual({})
    expect((await prisma.book.findUniqueOrThrow({ where: { id: book.id } })).blurb).toBeNull()
  })

  it('requires a bookId to set a blurb', async () => {
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
    await expect(updateBlurbAction(sectionForm({ bookId: '', blurb: 'x' }))).rejects.toThrow('required')
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/app/admin-actions.test.ts`
Expected: FAIL (`updateClubNameAction` and `updateBlurbAction` are not exported).

- [ ] **Step 3: Implement the actions**

In `src/app/admin/actions.ts`: add `import { setClubName } from '@/lib/club'` and add `setBlurb` to the existing `@/lib/books` import. Add these two functions after `updateTotalChaptersAction`:

```ts
export async function updateClubNameAction(formData: FormData): Promise<FormResult> {
  await requireAdmin()
  return reportingValidation(async () => {
    await setClubName(String(formData.get('clubName') ?? ''))
    // The name shows in the header of every page.
    revalidatePath('/', 'layout')
  })
}

export async function updateBlurbAction(formData: FormData): Promise<FormResult> {
  await requireAdmin()
  const bookId = String(formData.get('bookId') ?? '')
  if (!bookId) {
    throw new Error('bookId is required')
  }
  return reportingValidation(async () => {
    await setBlurb(bookId, String(formData.get('blurb') ?? ''))
    revalidateBookPages()
  })
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/app/admin-actions.test.ts`
Expected: PASS.

- [ ] **Step 5: Add text-area support to `AdminForm`**

In `src/components/AdminForm.tsx`, change the loop condition in `evaluate()` from:

```ts
      if (element instanceof HTMLInputElement && element.name && element.type !== 'hidden') {
```

to:

```ts
      if (
        (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) &&
        element.name &&
        element.type !== 'hidden'
      ) {
```

- [ ] **Step 6: Add the forms to the admin page**

In `src/app/admin/page.tsx`: add `Textarea` to the `@chakra-ui/react` import; add `import { getClubName } from '@/lib/club'`; add `updateClubNameAction, updateBlurbAction` to the import from `./actions`; in `AdminPage`, after `const books = await listBooks()` add `const clubName = await getClubName()`.

Insert this block immediately before the `<Box>` that contains the "New book" heading:

```tsx
      <Box>
        <Heading size="md" mb={2}>
          Club
        </Heading>
        <AdminForm action={updateClubNameAction} rule={{ kind: 'clubName' }} mode="edit" submitLabel="Save">
          <Input
            name="clubName"
            defaultValue={clubName ?? ''}
            placeholder="Club name, e.g. The Thursday Readers"
            aria-label="Club name"
            maxW="md"
          />
        </AdminForm>
      </Box>
```

Insert this block immediately after the closing `</AdminForm>` of each book's "Total chapters" form (the one with `action={updateTotalChaptersAction}`):

```tsx
            <AdminForm
              action={updateBlurbAction}
              rule={{ kind: 'blurb' }}
              mode="edit"
              submitLabel="Save"
              hiddenFields={{ bookId: book.id }}
              mt={3}
            >
              <Textarea
                name="blurb"
                defaultValue={book.blurb ?? ''}
                placeholder="Blurb (optional)"
                aria-label="Blurb"
                size="sm"
                rows={3}
              />
            </AdminForm>
```

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors; all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/app/admin/actions.ts src/app/admin/page.tsx src/components/AdminForm.tsx tests/app/admin-actions.test.ts
git commit -m "feat: admin forms for the club name and book blurbs"
```

---

### Task 4: Left pane (cover and book panel)

UI task: there is no component test harness in this repo, so verification is the type check and the final browser walkthrough in Task 9.

**Files:**
- Create: `src/components/CoverImage.tsx`, `src/components/BookPanel.tsx`

**Interfaces:**
- Consumes (Task 2): `BookViewData`; existing `ProgressStepper`, `setProgressAction`.
- Produces: `<CoverImage book coverVersion width? />`; `<BookPanel data label />`.

- [ ] **Step 1: Create `src/components/CoverImage.tsx`**

```tsx
import { Box, Image, Text } from '@chakra-ui/react'

// The uploaded cover when there is one; otherwise a generated Claret panel with a gold frame.
export function CoverImage({
  book,
  coverVersion,
  width = '180px',
}: {
  book: { id: string; title: string; author: string }
  coverVersion: number | null
  width?: string
}) {
  if (coverVersion !== null) {
    return (
      <Image
        src={`/books/${book.id}/cover?v=${coverVersion}`}
        alt={`Cover of ${book.title}`}
        w={width}
        borderRadius="md"
        boxShadow="xl"
      />
    )
  }

  return (
    <Box
      role="img"
      aria-label={`Cover of ${book.title}`}
      w={width}
      aspectRatio={2 / 3}
      bg="claret"
      borderRadius="md"
      boxShadow="xl"
      p="6%"
    >
      <Box
        h="100%"
        borderWidth="1px"
        borderColor="antiqueGold"
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        textAlign="center"
        px={3}
        gap={3}
      >
        <Box aria-hidden boxSize="8px" bg="antiqueGold" transform="rotate(45deg)" />
        <Text fontFamily="heading" fontWeight={600} fontSize="xl" lineHeight="1.15" color="antiqueGold">
          {book.title}
        </Text>
        <Box aria-hidden w="40%" h="1px" bg="antiqueGold" opacity={0.6} />
        <Text fontSize="xs" color="parchment">
          {book.author}
        </Text>
      </Box>
    </Box>
  )
}
```

- [ ] **Step 2: Create `src/components/BookPanel.tsx`**

```tsx
import { Box, Heading, Text, VStack } from '@chakra-ui/react'
import type { BookViewData } from '@/lib/book-view'
import { setProgressAction } from '@/app/sections/actions'
import { CoverImage } from '@/components/CoverImage'
import { ProgressStepper } from '@/components/ProgressStepper'

export function BookPanel({ data, label }: { data: BookViewData; label: string }) {
  const { book, finished, sections } = data

  return (
    <VStack align="stretch" spacing={5} p={8}>
      <Box alignSelf="center">
        <CoverImage book={book} coverVersion={book.coverVersion} />
      </Box>
      <Box>
        <Text fontSize="xs" letterSpacing="0.14em" textTransform="uppercase" color="dustyRose">
          {label}
        </Text>
        <Heading as="h1" size="xl" mt={1}>
          {book.title}
        </Heading>
        <Text fontFamily="heading" fontStyle="italic" fontSize="lg" color="mist" mt={1}>
          {book.author}
        </Text>
      </Box>
      {book.blurb && <Text whiteSpace="pre-wrap">{book.blurb}</Text>}
      <ProgressStepper
        bookId={book.id}
        totalChapters={book.totalChapters}
        initialFinished={finished}
        sections={sections}
        saveProgress={setProgressAction}
      />
    </VStack>
  )
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/CoverImage.tsx src/components/BookPanel.tsx
git commit -m "feat: cover image and book panel for the left pane"
```

---

### Task 5: Middle pane (thread cards and list)

**Files:**
- Create: `src/components/ThreadCard.tsx`, `src/components/ThreadList.tsx`

**Interfaces:**
- Consumes (Task 2): `SectionSummary` from `@/lib/sections`; existing `chapterRangeName`.
- Produces: `<ThreadCard section active basePath />`; `<ThreadList sections selectedId basePath />`.

- [ ] **Step 1: Create `src/components/ThreadCard.tsx`**

```tsx
import NextLink from 'next/link'
import { Box, Flex, Link, Text } from '@chakra-ui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronRight, faLock } from '@fortawesome/free-solid-svg-icons'
import { chapterRangeName } from '@/lib/chapters'
import type { SectionSummary } from '@/lib/sections'

const LABEL_PROPS = { fontSize: 'xs', letterSpacing: '0.14em', textTransform: 'uppercase' } as const

// Three states: sealed, unlocked regular, and unlocked active (the selected thread).
export function ThreadCard({
  section,
  active,
  basePath,
}: {
  section: SectionSummary
  active: boolean
  basePath: string
}) {
  const range = chapterRangeName(section.startChapter, section.endChapter)

  if (section.status === 'locked') {
    const toGo = section.chaptersToGo
    return (
      <Flex
        as="li"
        listStyleType="none"
        gap={4}
        align="center"
        p={4}
        bg="sealed"
        borderWidth="1px"
        borderStyle="dashed"
        borderColor="borderMuted"
        borderRadius="xl"
      >
        <Flex
          aria-hidden
          flexShrink={0}
          boxSize="44px"
          borderRadius="full"
          borderWidth="1px"
          borderColor="borderMuted"
          align="center"
          justify="center"
          color="mist"
        >
          <FontAwesomeIcon icon={faLock} />
        </Flex>
        <Box>
          <Text {...LABEL_PROPS} color="mist">
            {range}
          </Text>
          <Text fontFamily="heading" fontStyle="italic" fontWeight={600} fontSize="xl" color="mist">
            Sealed
          </Text>
          <Text fontSize="sm" color="mist">
            Opens after chapter {section.endChapter}, {toGo} chapter{toGo === 1 ? '' : 's'} to go
          </Text>
        </Box>
      </Flex>
    )
  }

  const title = section.title?.trim() || null
  const notes = section.postCount

  return (
    <Box as="li" listStyleType="none">
      <Link
        as={NextLink}
        href={`${basePath}?thread=${encodeURIComponent(section.id)}`}
        scroll={false}
        aria-current={active ? 'true' : undefined}
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        gap={3}
        p={4}
        bg={active ? 'bubbleMine' : 'mulberry'}
        borderWidth="1px"
        borderColor={active ? 'antiqueGold' : 'borderOpen'}
        borderRadius="xl"
        color="parchment"
        _hover={{ borderColor: 'antiqueGold', textDecoration: 'none' }}
      >
        <Box minW={0}>
          {title && (
            <Text {...LABEL_PROPS} color="antiqueGold">
              {range}
            </Text>
          )}
          <Text fontFamily="heading" fontWeight={600} fontSize="2xl" lineHeight="1.2" color="parchment">
            {title ?? range}
          </Text>
          <Text fontSize="sm" color="mist" mt={1}>
            {notes} note{notes === 1 ? '' : 's'}
          </Text>
        </Box>
        <Box aria-hidden color="antiqueGold" flexShrink={0}>
          <FontAwesomeIcon icon={faChevronRight} />
        </Box>
      </Link>
    </Box>
  )
}
```

- [ ] **Step 2: Create `src/components/ThreadList.tsx`**

```tsx
import { Box, Heading, Text, VStack } from '@chakra-ui/react'
import type { SectionSummary } from '@/lib/sections'
import { ThreadCard } from '@/components/ThreadCard'

export function ThreadList({
  sections,
  selectedId,
  basePath,
}: {
  sections: SectionSummary[]
  selectedId: string | null
  basePath: string
}) {
  return (
    <Box p={8}>
      <Heading as="h2" size="lg">
        The conversations
      </Heading>
      <Text mt={2} color="mist">
        {sections.length === 0
          ? 'Discussion threads for this book will open up soon. Start reading, and check back shortly!'
          : 'Threads open once you finish its last chapter. Sealed threads show nothing so no spoilers!'}
      </Text>
      <VStack as="ul" align="stretch" spacing={4} mt={6} p={0}>
        {sections.map((section) => (
          <ThreadCard key={section.id} section={section} active={section.id === selectedId} basePath={basePath} />
        ))}
      </VStack>
    </Box>
  )
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ThreadCard.tsx src/components/ThreadList.tsx
git commit -m "feat: thread cards and conversation list for the middle pane"
```

---

### Task 6: Right pane (thread, notes, composer)

**Files:**
- Create: `src/components/MessagesScroller.tsx`, `src/components/NoteComposer.tsx`, `src/components/NoteActions.tsx`, `src/components/NoteItem.tsx`, `src/components/ThreadPane.tsx`
- Modify: `src/app/sections/actions.ts` (revalidation paths)

**Interfaces:**
- Consumes: Task 1 `computeTextareaHeight`, `appendStarter`, `STARTER_PROMPTS`; Task 2 `ThreadResult`/`PostWithAuthor`; existing `createPostAction`, `deletePostAction`, `DeletePostButton`, `PostTimestamp`, `UserAvatar`, `chapterRangeName`.
- Produces: `<ThreadPane thread sectionId viewerId backHref />` where `thread` is the unlocked variant of `ThreadResult`; `<NoteComposer action parentPostId? placeholder variant starters? onSent? />`.

- [ ] **Step 1: Update revalidation in `src/app/sections/actions.ts`**

The thread page is gone, so notes and progress now live on `/` and `/shelf/[bookId]`. Replace the whole file with:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/session'
import { setProgress } from '@/lib/progress'
import { createPost, deletePost } from '@/lib/posts'

function revalidateBookViews() {
  revalidatePath('/')
  revalidatePath('/shelf')
  revalidatePath('/shelf/[bookId]', 'page')
}

export async function setProgressAction(bookId: string, chaptersFinished: number): Promise<number> {
  const user = await requireUser()
  const saved = await setProgress(user.id, bookId, chaptersFinished)
  revalidateBookViews()
  return saved
}

export async function createPostAction(sectionId: string, formData: FormData) {
  const user = await requireUser()
  const body = String(formData.get('body') ?? '')
  const parentPostId = formData.get('parentPostId')
  await createPost(sectionId, user.id, body, parentPostId ? String(parentPostId) : undefined)
  revalidateBookViews()
}

export async function deletePostAction(sectionId: string, postId: string) {
  const user = await requireUser()
  await deletePost(postId, user.id)
  revalidateBookViews()
}
```

Run: `npm test -- tests/app/section-actions.test.ts`
Expected: PASS (the action tests mock `revalidatePath`).

- [ ] **Step 2: Create `src/components/MessagesScroller.tsx`**

```tsx
'use client'

import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { Box } from '@chakra-ui/react'

// Scrolls to the newest note when it mounts and whenever `scrollKey` changes. The key is the
// thread id plus its top-level note count, so a reply to an older note does not jump the pane.
export function MessagesScroller({ scrollKey, children }: { scrollKey: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (el) el.scrollTop = el.scrollHeight
  }, [scrollKey])

  return (
    <Box ref={ref} flex="1" minH={0} overflowY="auto" px={{ base: 4, md: 8 }} py={6}>
      {children}
    </Box>
  )
}
```

- [ ] **Step 3: Create `src/components/NoteComposer.tsx`**

```tsx
'use client'

import { useLayoutEffect, useRef, useState, useTransition, type FormEvent, type KeyboardEvent } from 'react'
import {
  Box,
  Button,
  HStack,
  IconButton,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Text,
  Textarea,
  useDisclosure,
  VStack,
} from '@chakra-ui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRight, faCommentDots } from '@fortawesome/free-solid-svg-icons'
import { appendStarter, computeTextareaHeight } from '@/lib/composer'

const MAX_LINES = 6

// The note box. The text area grows with what you type, up to six lines, then scrolls. Starters
// and the send button are bottom-aligned so they stay put as it grows. Enter inserts a newline;
// Ctrl/Cmd+Enter or the send button posts. Whitespace-only notes cannot be sent.
export function NoteComposer({
  action,
  parentPostId,
  placeholder,
  variant,
  starters,
  onSent,
}: {
  action: (formData: FormData) => Promise<void>
  parentPostId?: string
  placeholder: string
  variant: 'bar' | 'inline'
  starters?: string[]
  onSent?: () => void
}) {
  const textRef = useRef<HTMLTextAreaElement>(null)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const starterMenu = useDisclosure()

  useLayoutEffect(() => {
    const el = textRef.current
    if (!el) return
    el.style.height = 'auto'
    const style = window.getComputedStyle(el)
    const fontSize = parseFloat(style.fontSize) || 16
    const { height, scroll } = computeTextareaHeight({
      scrollHeight: el.scrollHeight,
      lineHeight: parseFloat(style.lineHeight) || fontSize * 1.5,
      paddingSpace: parseFloat(style.paddingTop) + parseFloat(style.paddingBottom),
      borderSpace: parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth),
      maxLines: MAX_LINES,
    })
    el.style.height = `${height}px`
    el.style.overflowY = scroll ? 'auto' : 'hidden'
  }, [text])

  const canSend = text.trim() !== '' && !pending

  function send() {
    const body = text.trim()
    if (!body || pending) return
    const formData = new FormData()
    formData.set('body', body)
    if (parentPostId) formData.set('parentPostId', parentPostId)
    startTransition(async () => {
      try {
        await action(formData)
        setText('')
        setError(null)
        onSent?.()
      } catch {
        setError('Could not post your note. Try again.')
      }
    })
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      send()
    }
  }

  return (
    <Box
      as="form"
      w="100%"
      onSubmit={(event: FormEvent) => {
        event.preventDefault()
        send()
      }}
    >
      <HStack align="flex-end" spacing={3}>
        {variant === 'bar' && starters && (
          <Popover
            isOpen={starterMenu.isOpen}
            onOpen={starterMenu.onOpen}
            onClose={starterMenu.onClose}
            placement="top-start"
            isLazy
          >
            <PopoverTrigger>
              <Button
                type="button"
                variant="outline"
                flexShrink={0}
                borderRadius="full"
                borderColor="antiqueGold"
                color="antiqueGold"
                leftIcon={<FontAwesomeIcon icon={faCommentDots} />}
              >
                Starters
              </Button>
            </PopoverTrigger>
            <PopoverContent bg="velvet" borderColor="border" w="min(28rem, 90vw)">
              <PopoverBody p={2}>
                <VStack align="stretch" spacing={1}>
                  {starters.map((prompt) => (
                    <Button
                      key={prompt}
                      type="button"
                      variant="ghost"
                      h="auto"
                      py={2}
                      px={3}
                      justifyContent="flex-start"
                      textAlign="left"
                      whiteSpace="normal"
                      fontWeight="normal"
                      color="body"
                      onClick={() => {
                        setText((current) => appendStarter(current, prompt))
                        starterMenu.onClose()
                        textRef.current?.focus()
                      }}
                    >
                      {prompt}
                    </Button>
                  ))}
                </VStack>
              </PopoverBody>
            </PopoverContent>
          </Popover>
        )}
        <Textarea
          ref={textRef}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label={placeholder}
          rows={1}
          resize="none"
          minH={0}
          lineHeight="1.5"
          py={2}
          px={4}
          flex="1"
          borderRadius={variant === 'bar' ? '2xl' : 'xl'}
        />
        <IconButton
          type="submit"
          aria-label="Send note"
          icon={<FontAwesomeIcon icon={faArrowRight} />}
          isRound
          flexShrink={0}
          isDisabled={!canSend}
        />
      </HStack>
      {error && (
        <Text role="alert" mt={1} fontSize="sm" color="danger">
          {error}
        </Text>
      )}
    </Box>
  )
}
```

- [ ] **Step 4: Create `src/components/NoteActions.tsx`**

```tsx
'use client'

import { useState, type ReactNode } from 'react'
import { Box, Button, HStack } from '@chakra-ui/react'
import { NoteComposer } from '@/components/NoteComposer'

// The row under a note (Reply, Hide/Show replies, Delete) plus the replies themselves, which
// are rendered by the server and passed in as children so they can be toggled here.
export function NoteActions({
  replyAction,
  parentPostId,
  replyCount,
  deleteSlot,
  children,
}: {
  replyAction: (formData: FormData) => Promise<void>
  parentPostId: string
  replyCount: number
  deleteSlot?: ReactNode
  children?: ReactNode
}) {
  const [replying, setReplying] = useState(false)
  const [showReplies, setShowReplies] = useState(true)

  return (
    <>
      <HStack spacing={4} mt={1} px={1}>
        <Button variant="link" size="sm" aria-expanded={replying} onClick={() => setReplying((open) => !open)}>
          Reply
        </Button>
        {replyCount > 0 && (
          <Button variant="link" size="sm" aria-expanded={showReplies} onClick={() => setShowReplies((show) => !show)}>
            {showReplies ? 'Hide replies' : `Show replies (${replyCount})`}
          </Button>
        )}
        {deleteSlot}
      </HStack>
      {replying && (
        <Box mt={2}>
          <NoteComposer
            variant="inline"
            action={replyAction}
            parentPostId={parentPostId}
            placeholder="Reply…"
            onSent={() => setReplying(false)}
          />
        </Box>
      )}
      {showReplies && children}
    </>
  )
}
```

- [ ] **Step 5: Create `src/components/NoteItem.tsx`**

```tsx
import { Box, Flex, Text } from '@chakra-ui/react'
import type { PostWithAuthor } from '@/lib/sections'
import { createPostAction, deletePostAction } from '@/app/sections/actions'
import { DeletePostButton } from '@/components/DeletePostButton'
import { NoteActions } from '@/components/NoteActions'
import { PostTimestamp } from '@/components/PostTimestamp'
import { UserAvatar } from '@/components/UserAvatar'

function Bubble({ post, mine }: { post: PostWithAuthor; mine: boolean }) {
  return (
    <Box bg={mine ? 'bubbleMine' : 'bubbleOther'} borderWidth="1px" borderColor="border" borderRadius="xl" px={4} py={3}>
      <Flex justify="space-between" align="baseline" gap={3}>
        <Text fontSize="sm" fontWeight={600} color="dustyRose">
          {post.user.name ?? 'Member'}
        </Text>
        <PostTimestamp createdAt={post.createdAt} />
      </Flex>
      <Text mt={1} whiteSpace="pre-wrap">
        {post.body}
      </Text>
    </Box>
  )
}

// One top-level note: avatar outside the bubble, then its actions and its replies.
export function NoteItem({
  note,
  replies,
  viewerId,
  sectionId,
}: {
  note: PostWithAuthor
  replies: PostWithAuthor[]
  viewerId: string
  sectionId: string
}) {
  const mine = note.user.id === viewerId

  return (
    <Flex gap={3} align="flex-start">
      <UserAvatar user={note.user} />
      <Box flex="1" minW={0}>
        <Bubble post={note} mine={mine} />
        <NoteActions
          replyAction={createPostAction.bind(null, sectionId)}
          parentPostId={note.id}
          replyCount={replies.length}
          deleteSlot={
            mine ? (
              <DeletePostButton
                replyCount={replies.length}
                action={deletePostAction.bind(null, sectionId, note.id)}
              />
            ) : null
          }
        >
          {replies.map((reply) => {
            const replyMine = reply.user.id === viewerId
            return (
              <Flex key={reply.id} gap={3} align="flex-start" mt={3} ml={{ base: 0, md: 4 }}>
                <UserAvatar user={reply.user} size={30} />
                <Box flex="1" minW={0}>
                  <Bubble post={reply} mine={replyMine} />
                  {replyMine && (
                    <Box mt={1} px={1}>
                      <DeletePostButton replyCount={0} action={deletePostAction.bind(null, sectionId, reply.id)} />
                    </Box>
                  )}
                </Box>
              </Flex>
            )
          })}
        </NoteActions>
      </Box>
    </Flex>
  )
}
```

- [ ] **Step 6: Create `src/components/ThreadPane.tsx`**

```tsx
import NextLink from 'next/link'
import { Box, Flex, Heading, HStack, Link, Text, VStack } from '@chakra-ui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faShield } from '@fortawesome/free-solid-svg-icons'
import { chapterRangeName } from '@/lib/chapters'
import { STARTER_PROMPTS } from '@/lib/prompts'
import type { ThreadResult } from '@/lib/sections'
import { createPostAction } from '@/app/sections/actions'
import { MessagesScroller } from '@/components/MessagesScroller'
import { NoteComposer } from '@/components/NoteComposer'
import { NoteItem } from '@/components/NoteItem'

type OpenThread = Extract<ThreadResult, { status: 'unlocked' }>

function SafeGroundPill({ endChapter }: { endChapter: number }) {
  return (
    <HStack
      as="span"
      display="inline-flex"
      spacing={2}
      mt={3}
      px={3}
      py={1}
      borderWidth="1px"
      borderColor="borderMuted"
      borderRadius="full"
    >
      <Box as="span" aria-hidden color="mist">
        <FontAwesomeIcon icon={faShield} />
      </Box>
      <Text as="span" fontSize="sm" color="parchment">
        Safe ground: nothing past chapter {endChapter}
      </Text>
    </HStack>
  )
}

export function ThreadPane({
  thread,
  sectionId,
  viewerId,
  backHref,
}: {
  thread: OpenThread
  sectionId: string
  viewerId: string
  backHref: string
}) {
  const topLevel = thread.posts.filter((post) => !post.parentPostId)
  const repliesTo = (postId: string) => thread.posts.filter((post) => post.parentPostId === postId)
  const range = chapterRangeName(thread.startChapter, thread.endChapter)
  const title = thread.title?.trim() || null

  return (
    <Flex direction="column" h="100%" minH={0}>
      <Box px={{ base: 4, md: 8 }} pt={6} pb={4} borderBottomWidth="1px" borderColor="divider">
        <Link as={NextLink} href={backHref} display={{ base: 'inline-block', lg: 'none' }} mb={3} fontSize="sm">
          ← Back to conversations
        </Link>
        {title && (
          <Text fontSize="xs" letterSpacing="0.14em" textTransform="uppercase" color="antiqueGold">
            {range}
          </Text>
        )}
        <Heading as="h2" size="xl" mt={1}>
          {title ?? range}
        </Heading>
        <SafeGroundPill endChapter={thread.endChapter} />
      </Box>

      <MessagesScroller scrollKey={`${sectionId}:${topLevel.length}`}>
        {topLevel.length === 0 ? (
          <Text color="mist" fontStyle="italic">
            No notes yet. Start the conversation below.
          </Text>
        ) : (
          <VStack as="ul" align="stretch" spacing={6} p={0} m={0} listStyleType="none">
            {topLevel.map((note) => (
              <Box as="li" key={note.id}>
                <NoteItem note={note} replies={repliesTo(note.id)} viewerId={viewerId} sectionId={sectionId} />
              </Box>
            ))}
          </VStack>
        )}
      </MessagesScroller>

      <Box px={{ base: 4, md: 8 }} py={4} borderTopWidth="1px" borderColor="divider">
        <NoteComposer
          variant="bar"
          action={createPostAction.bind(null, sectionId)}
          placeholder="Start a new note"
          starters={STARTER_PROMPTS}
        />
      </Box>
    </Flex>
  )
}
```

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors; all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/app/sections/actions.ts src/components/MessagesScroller.tsx src/components/NoteComposer.tsx src/components/NoteActions.tsx src/components/NoteItem.tsx src/components/ThreadPane.tsx
git commit -m "feat: thread pane with message bubbles, replies, Starters and the growing composer"
```

---

### Task 7: BookView and routes (This month, Our shelf, redirects)

**Files:**
- Create: `src/lib/layout.ts`, `src/components/BookView.tsx`, `src/app/shelf/page.tsx`, `src/app/shelf/[bookId]/page.tsx`
- Modify: `src/app/page.tsx`, `src/app/sections/[sectionId]/page.tsx`, `src/app/past-books/page.tsx`, `src/theme.ts`
- Delete: `src/components/DiscussionPromptCard.tsx`, `src/components/SectionRow.tsx`, `src/components/PostForm.tsx`, `src/components/SectionActivity.tsx`

**Interfaces:**
- Consumes: Tasks 1, 2, 4, 5, 6 (`getBookView`, `BookViewData`, `bookPath`, `threadHref`, `getSectionBookId`, `BookPanel`, `ThreadList`, `ThreadPane`, `CoverImage`).
- Produces: `NAV_HEIGHT_PX`; `<BookView data viewerId basePath label />`.

- [ ] **Step 1: Create `src/lib/layout.ts`**

```ts
// Height of the header on large screens; the three-pane view fills the rest of the viewport.
export const NAV_HEIGHT_PX = 64
```

- [ ] **Step 2: Add thin dark scrollbars to the theme**

In `src/theme.ts`, replace the `styles` block with:

```ts
  styles: {
    global: {
      body: {
        bg: 'midnightPlum',
        color: 'parchment',
      },
      '*': {
        scrollbarWidth: 'thin',
        scrollbarColor: '#5a4050 transparent',
      },
      '*::-webkit-scrollbar': { width: '8px', height: '8px' },
      '*::-webkit-scrollbar-thumb': { background: '#5a4050', borderRadius: '8px' },
      '*::-webkit-scrollbar-track': { background: 'transparent' },
    },
  },
```

(`#5a4050` is the existing `border` token's value; CSS rules cannot read Chakra tokens here.)

- [ ] **Step 3: Create `src/components/BookView.tsx`**

```tsx
import { Box, Flex, Grid, Heading, Text } from '@chakra-ui/react'
import { NAV_HEIGHT_PX } from '@/lib/layout'
import type { BookViewData } from '@/lib/book-view'
import { BookPanel } from '@/components/BookPanel'
import { ThreadList } from '@/components/ThreadList'
import { ThreadPane } from '@/components/ThreadPane'

// The three panes for one book. On large screens they sit side by side and scroll on their own;
// on small screens one shows at a time: the book and thread list until a thread is explicitly
// chosen, then the thread.
export function BookView({
  data,
  viewerId,
  basePath,
  label,
}: {
  data: BookViewData
  viewerId: string
  basePath: string
  label: string
}) {
  const { sections, selectedId, explicit, thread } = data
  const fullHeight = `calc(100dvh - ${NAV_HEIGHT_PX}px)`

  return (
    <Grid templateColumns={{ base: '1fr', lg: '1fr 1.15fr 1.8fr' }} h={{ lg: fullHeight }} minH={{ base: fullHeight }}>
      <Box
        as="aside"
        aria-label="Book"
        display={{ base: explicit ? 'none' : 'block', lg: 'block' }}
        overflowY={{ lg: 'auto' }}
        minH={0}
      >
        <BookPanel data={data} label={label} />
      </Box>
      <Box
        as="nav"
        aria-label="Conversations"
        display={{ base: explicit ? 'none' : 'block', lg: 'block' }}
        overflowY={{ lg: 'auto' }}
        minH={0}
        borderLeftWidth={{ lg: '1px' }}
        borderColor="divider"
      >
        <ThreadList sections={sections} selectedId={selectedId} basePath={basePath} />
      </Box>
      <Box
        as="main"
        display={{ base: explicit ? 'block' : 'none', lg: 'block' }}
        bg="panel"
        borderLeftWidth={{ lg: '1px' }}
        borderColor="divider"
        minH={0}
        h={{ base: fullHeight, lg: '100%' }}
      >
        {thread && selectedId ? (
          <ThreadPane thread={thread} sectionId={selectedId} viewerId={viewerId} backHref={basePath} />
        ) : (
          <Flex h="100%" align="center" justify="center" direction="column" textAlign="center" p={8} gap={2}>
            <Heading as="h2" size="lg" fontStyle="italic" color="mist">
              Pick a conversation to read the notes.
            </Heading>
            <Text color="mist">Threads open as you move your place in the book forward.</Text>
          </Flex>
        )}
      </Box>
    </Grid>
  )
}
```

- [ ] **Step 4: Replace `src/app/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import { Box, Text } from '@chakra-ui/react'
import { requireUser } from '@/lib/session'
import { listBooks } from '@/lib/books'
import { getBookView } from '@/lib/book-view'
import { BookView } from '@/components/BookView'

export default async function HomePage({ searchParams }: { searchParams: { thread?: string | string[] } }) {
  const user = await requireUser()
  const [book] = await listBooks('current')

  if (!book) {
    return (
      <Box p={8}>
        <Text>No current book yet — check back soon.</Text>
      </Box>
    )
  }

  const requested = typeof searchParams.thread === 'string' ? searchParams.thread : undefined
  const data = await getBookView(book.id, user.id, requested)
  if (!data) notFound()

  return <BookView data={data} viewerId={user.id} basePath="/" label="This month's book" />
}
```

- [ ] **Step 5: Create `src/app/shelf/[bookId]/page.tsx`**

```tsx
import { notFound, redirect } from 'next/navigation'
import { requireUser } from '@/lib/session'
import { listBooks } from '@/lib/books'
import { getBookView } from '@/lib/book-view'
import { bookPath } from '@/lib/threads'
import { BookView } from '@/components/BookView'

export default async function ShelfBookPage({
  params,
  searchParams,
}: {
  params: { bookId: string }
  searchParams: { thread?: string | string[] }
}) {
  const user = await requireUser()
  const [current] = await listBooks('current')
  const requested = typeof searchParams.thread === 'string' ? searchParams.thread : undefined

  // The current book lives at "/", so send anyone who lands here to the one canonical place.
  if (current && params.bookId === current.id) {
    redirect(requested ? `/?thread=${encodeURIComponent(requested)}` : '/')
  }

  const data = await getBookView(params.bookId, user.id, requested)
  if (!data) notFound()

  return (
    <BookView
      data={data}
      viewerId={user.id}
      basePath={bookPath(params.bookId, current?.id ?? null)}
      label="On our shelf"
    />
  )
}
```

- [ ] **Step 6: Create `src/app/shelf/page.tsx`**

```tsx
import NextLink from 'next/link'
import { Box, Heading, Link, SimpleGrid, Text } from '@chakra-ui/react'
import { requireUser } from '@/lib/session'
import { listBooks } from '@/lib/books'
import { getProgress } from '@/lib/progress'
import { CoverImage } from '@/components/CoverImage'

export default async function ShelfPage() {
  const user = await requireUser()
  const books = await listBooks('past')
  const cards = await Promise.all(
    books.map(async (book) => ({ book, finished: await getProgress(user.id, book.id) }))
  )

  return (
    <Box p={{ base: 6, md: 10 }}>
      <Heading as="h1" size="xl">
        Our shelf
      </Heading>
      {cards.length === 0 && (
        <Text mt={4} color="mist">
          No past books yet.
        </Text>
      )}
      <SimpleGrid minChildWidth="200px" spacing={8} mt={8}>
        {cards.map(({ book, finished }) => (
          <Link
            key={book.id}
            as={NextLink}
            href={`/shelf/${book.id}`}
            display="block"
            _hover={{ textDecoration: 'none' }}
          >
            <CoverImage book={book} coverVersion={book.cover?.updatedAt.getTime() ?? null} width="100%" />
            <Heading as="h2" size="md" mt={3}>
              {book.title}
            </Heading>
            <Text fontStyle="italic" color="mist">
              {book.author}
            </Text>
            <Text fontSize="sm" color="dustyRose" mt={1}>
              {finished} of {book.totalChapters} chapters
            </Text>
          </Link>
        ))}
      </SimpleGrid>
    </Box>
  )
}
```

- [ ] **Step 7: Turn the old routes into redirects**

Replace `src/app/sections/[sectionId]/page.tsx` with:

```tsx
import { notFound, redirect } from 'next/navigation'
import { requireUser } from '@/lib/session'
import { listBooks } from '@/lib/books'
import { getSectionBookId } from '@/lib/sections'
import { threadHref } from '@/lib/threads'

// Old thread links keep working: they now open the thread inside the three-pane view.
export default async function SectionRedirect({ params }: { params: { sectionId: string } }) {
  await requireUser()
  const bookId = await getSectionBookId(params.sectionId)
  if (!bookId) notFound()
  const [current] = await listBooks('current')
  redirect(threadHref(bookId, current?.id ?? null, params.sectionId))
}
```

Replace `src/app/past-books/page.tsx` with:

```tsx
import { redirect } from 'next/navigation'

export default function PastBooksRedirect() {
  redirect('/shelf')
}
```

- [ ] **Step 8: Delete the replaced components**

Run: `git rm src/components/DiscussionPromptCard.tsx src/components/SectionRow.tsx src/components/PostForm.tsx src/components/SectionActivity.tsx`

Run: `grep -rnE "DiscussionPromptCard|SectionRow|PostForm|SectionActivity" src tests | grep -v "^src/components/NoteComposer"`
Expected: no output (nothing still imports them).

- [ ] **Step 9: Verify**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors; all tests pass.

- [ ] **Step 10: Commit**

```bash
git add src/lib/layout.ts src/theme.ts src/components/BookView.tsx src/app/page.tsx src/app/shelf src/app/sections/[sectionId]/page.tsx src/app/past-books/page.tsx
git commit -m "feat: three-pane BookView, Our shelf, and redirects for the old thread routes"
```

(`git rm` already staged the four deletions, so they go in this commit.)

---

### Task 8: Members page

**Files:**
- Create: `src/app/members/page.tsx`

**Interfaces:**
- Consumes (Task 2): `listMembers`; existing `UserAvatar`, `requireUser`.

- [ ] **Step 1: Create `src/app/members/page.tsx`**

```tsx
import { Box, Flex, Heading, SimpleGrid, Text } from '@chakra-ui/react'
import { requireUser } from '@/lib/session'
import { listMembers } from '@/lib/members'
import { UserAvatar } from '@/components/UserAvatar'

export default async function MembersPage() {
  await requireUser()
  const members = await listMembers()

  return (
    <Box p={{ base: 6, md: 10 }}>
      <Heading as="h1" size="xl">
        Members
      </Heading>
      <Text mt={2} color="mist">
        {members.length} {members.length === 1 ? 'member' : 'members'}
      </Text>
      <SimpleGrid as="ul" listStyleType="none" minChildWidth="200px" spacing={4} mt={8} p={0}>
        {members.map((member) => (
          <Flex
            as="li"
            key={member.id}
            gap={3}
            align="center"
            p={4}
            bg="velvet"
            borderWidth="1px"
            borderColor="border"
            borderRadius="xl"
          >
            <UserAvatar user={member} />
            <Text fontFamily="heading" fontSize="xl" fontWeight={600} color="parchment">
              {member.name ?? 'Member'}
            </Text>
          </Flex>
        ))}
      </SimpleGrid>
    </Box>
  )
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/members/page.tsx
git commit -m "feat: Members page"
```

---

### Task 9: Header (club name, nav, active link)

**Files:**
- Create: `src/components/NavLinks.tsx`
- Modify: `src/components/NavBar.tsx`, `src/app/layout.tsx`

**Interfaces:**
- Consumes: Task 1 `activeNavHref`; Task 2 `getClubName`; Task 7 `NAV_HEIGHT_PX`; existing `UserAvatar`, `signOut`.
- Produces: `<NavLinks isAdmin />`; `<NavBar user clubName />` where `user: { id: string; name?: string | null; isAdmin: boolean }`.

- [ ] **Step 1: Create `src/components/NavLinks.tsx`**

```tsx
'use client'

import NextLink from 'next/link'
import { usePathname } from 'next/navigation'
import { HStack, Link } from '@chakra-ui/react'
import { activeNavHref, type NavHref } from '@/lib/nav'

const LINKS: { href: NavHref; label: string }[] = [
  { href: '/', label: 'This month' },
  { href: '/shelf', label: 'Our shelf' },
  { href: '/members', label: 'Members' },
]

export function NavLinks({ isAdmin }: { isAdmin: boolean }) {
  const active = activeNavHref(usePathname())
  const links = isAdmin ? [...LINKS, { href: '/admin' as NavHref, label: 'Admin' }] : LINKS

  return (
    <HStack as="ul" listStyleType="none" spacing={{ base: 4, md: 6 }} m={0} p={0}>
      {links.map(({ href, label }) => (
        <li key={href}>
          <Link
            as={NextLink}
            href={href}
            aria-current={active === href ? 'page' : undefined}
            color={active === href ? 'parchment' : 'mist'}
            pb={1}
            borderBottomWidth="2px"
            borderColor={active === href ? 'antiqueGold' : 'transparent'}
            _hover={{ color: 'parchment', textDecoration: 'none' }}
          >
            {label}
          </Link>
        </li>
      ))}
    </HStack>
  )
}
```

- [ ] **Step 2: Replace `src/components/NavBar.tsx`**

```tsx
import NextLink from 'next/link'
import { Box, Button, Flex, HStack, Image, Link, Text } from '@chakra-ui/react'
import { signOut } from '@/auth'
import { NAV_HEIGHT_PX } from '@/lib/layout'
import { NavLinks } from '@/components/NavLinks'
import { UserAvatar } from '@/components/UserAvatar'

export function NavBar({
  user,
  clubName,
}: {
  user: { id: string; name?: string | null; isAdmin: boolean }
  clubName: string | null
}) {
  return (
    <Box
      as="header"
      bg="midnightPlum"
      borderBottomWidth="1px"
      borderColor="divider"
      px={{ base: 4, md: 8 }}
      py={{ base: 3, lg: 0 }}
      h={{ lg: `${NAV_HEIGHT_PX}px` }}
    >
      <Flex align="center" justify="space-between" wrap="wrap" gap={3} h="100%">
        <HStack spacing={4}>
          <Link
            as={NextLink}
            href="/"
            color="antiqueGold"
            _hover={{ textDecoration: 'none' }}
            fontWeight="bold"
            fontSize="1.25em"
            fontFamily="heading"
            display="flex"
            alignItems="center"
            gap={2}
          >
            <Image src="/pagefolk.svg" alt="" boxSize="1.75em" />
            PageFolk
          </Link>
          {clubName && (
            <>
              <Box aria-hidden boxSize="0.5em" bg="antiqueGold" transform="rotate(45deg)" />
              <Text fontFamily="heading" fontSize="lg" color="mist" noOfLines={1}>
                {clubName}
              </Text>
            </>
          )}
        </HStack>
        <HStack spacing={{ base: 4, md: 6 }}>
          <NavLinks isAdmin={user.isAdmin} />
          <UserAvatar user={{ id: user.id, name: user.name ?? null }} size={36} />
          <form
            action={async () => {
              'use server'
              await signOut()
            }}
          >
            <Button type="submit" size="sm" variant="link" color="mist">
              Sign out
            </Button>
          </form>
        </HStack>
      </Flex>
    </Box>
  )
}
```

- [ ] **Step 3: Update `src/app/layout.tsx`**

Add `import { getClubName } from '@/lib/club'` with the other imports. Replace the body of `RootLayout`'s data loading and nav line so that the function reads:

```tsx
export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  const clubName = session?.user ? await getClubName() : null

  return (
    <html lang="en" className={`${cormorant.variable} ${lora.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ColorModeScript initialColorMode="dark" />
        <Providers>
          {session?.user ? (
            <NavBar
              user={{
                id: session.user.id,
                name: session.user.name,
                isAdmin: Boolean(session.user.isAdmin),
              }}
              clubName={clubName}
            />
          ) : null}
          {children}
        </Providers>
      </body>
    </html>
  )
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors; all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/NavLinks.tsx src/components/NavBar.tsx src/app/layout.tsx
git commit -m "feat: header with club name, nav links and active-link underline"
```

---

### Task 10: Migrate the dev database and verify end to end

**Files:** none changed (operates on `prisma/dev.db`, git-ignored).

- [ ] **Step 1: Apply the additive schema to the dev database**

Stop `npm run dev` first (a running server caches the old Prisma client). Then:

```bash
npx prisma db push
```

Expected: "Your database is now in sync with your Prisma schema" with **no** data-loss warning (the `Club` table and `Book.blurb` column are additive). If a data-loss warning appears, stop and investigate.

Then confirm the data is intact:

```bash
python3 - <<'EOF'
import sqlite3
c = sqlite3.connect('file:prisma/dev.db?mode=ro', uri=True)
print('tables', [r[0] for r in c.execute("select name from sqlite_master where type='table' and name in ('Club')")])
print('book columns', [r[1] for r in c.execute('pragma table_info(Book)') if r[1] in ('blurb','totalChapters')])
print('books', c.execute('select count(*) from Book').fetchone()[0], 'sections', c.execute('select count(*) from Section').fetchone()[0], 'posts', c.execute('select count(*) from Post').fetchone()[0])
EOF
```

Expected: `tables ['Club']`; `book columns` includes `blurb` and `totalChapters`; the book, section and post counts match what they were before.

- [ ] **Step 2: Full automated verification**

```bash
npm test
npx tsc --noEmit
```

Expected: all tests pass; no type errors.

- [ ] **Step 3: Confirm nothing stale is left**

```bash
grep -rnE "past-books|brand\.|/sections/" src | grep -v "sections/actions"
```

Expected: no output (no code still points at the old routes or the removed color scale; the redirect pages live at those paths but do not mention them in their code).

- [ ] **Step 4: Start the dev server and walk through the app (ask the user)**

Start `npm run dev` (plain, without `--turbo`). Google sign-in cannot be scripted, so ask the user to check, on `localhost:3002`:

1. `/`: three panes side by side on a wide window; the left pane shows the cover (or the Claret placeholder), the label, title, author, blurb (if set) and the stepper; the middle pane shows the new intro line and cards in three states (regular, active with a gold border, sealed dashed); the right pane shows the thread with the Safe ground pill (shield icon), bubbles with avatars outside them, Reply / Hide replies, and the composer bar.
2. Clicking another open thread card changes the right pane and the URL (`?thread=`) without the page jumping to the top; a sealed card is not clickable.
3. Composer: type several lines and watch it grow to six lines and then scroll; Starters and the send arrow stay at the bottom; Starters inserts a prompt (appending to existing text); Enter adds a newline; Ctrl+Enter posts; the send button is disabled until there is non-whitespace text.
4. Replies: Reply opens an inline box; Hide replies collapses them; Delete works on your own notes.
5. Header: club name beside the wordmark (after setting it on `/admin`), nav underline follows the page; `/shelf` shows past books and opens them; `/members` lists members without emails.
6. Old links: `/sections/<an open thread id>` redirects into the three-pane view; `/past-books` goes to `/shelf`.
7. Narrow the window below the large breakpoint: the book and list show first; picking a thread fills the screen with "← Back to conversations".
8. `/admin`: set the club name and a blurb; Save/Cancel and validation behave like the other admin forms.

- [ ] **Step 5: Final state check**

Run: `git status --short`
Expected: only the untracked `bookclub concept.png`. Nothing from this plan is left uncommitted.
