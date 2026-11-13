// Pure helpers for The Long List. Kept free of Prisma so client components can import it.
export type SuggestionInput = { title: string; author: string; genre: string; synopsis: string }

export type LongListSort = 'votes' | 'newest' | 'az'

export type LongListEntry = {
  id: string
  title: string
  author: string
  genre: string | null
  synopsis: string
  createdAt: Date
  suggestedBy: { id: string; name: string | null }
  votes: number
  voted: boolean
  voters: { id: string; name: string | null }[]
  canEdit: boolean
}

export function parseSort(raw: string | string[] | undefined): LongListSort {
  return raw === 'newest' || raw === 'az' ? raw : 'votes'
}

function normalise(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function duplicateKey(title: string, author: string): string {
  return `${normalise(title)}|${normalise(author)}`
}

function sortableTitle(title: string): string {
  return title.trim().replace(/^(the|a|an)\s+/i, '')
}

export function sortLongList<T extends Pick<LongListEntry, 'title' | 'createdAt' | 'votes'>>(
  books: T[],
  sort: LongListSort,
): T[] {
  const newestFirst = (a: T, b: T) => b.createdAt.getTime() - a.createdAt.getTime()
  const compare =
    sort === 'newest'
      ? newestFirst
      : sort === 'az'
        ? (a: T, b: T) =>
            sortableTitle(a.title).localeCompare(sortableTitle(b.title), undefined, { sensitivity: 'base' }) ||
            newestFirst(a, b)
        : (a: T, b: T) => b.votes - a.votes || newestFirst(a, b)
  return [...books].sort(compare)
}

export function longListSummary(count: number): string {
  if (count === 0) return 'No books suggested yet'
  return `${count} ${count === 1 ? 'book' : 'books'} suggested · like as many as you want`
}

export function likeLabel(count: number): string {
  return `${count} ${count === 1 ? 'like' : 'likes'}`
}

// Where a "See it" / post-create link should go. The details panel only exists on wide
// screens, so narrow screens go to the book's own page. Other hrefs pass through.
export function longListTarget(href: string, wide: boolean, sort: LongListSort): string {
  const match = /^\/long-list\?book=([^&]+)$/.exec(href)
  if (!match) return href
  const id = match[1]
  return wide ? `/long-list?sort=${sort}&book=${id}` : `/long-list/${id}`
}

// The genres the books on the list actually have, alphabetically: the genre filter's options.
export function genresOnList(books: Pick<LongListEntry, 'genre'>[]): string[] {
  return [...new Set(books.map((book) => book.genre).filter((genre): genre is string => !!genre))].sort((a, b) =>
    a.localeCompare(b),
  )
}

// The ?genre= value when it's one of the list's genres; anything else means all genres.
export function parseGenre(raw: string | string[] | undefined, available: string[]): string | null {
  return typeof raw === 'string' && available.includes(raw) ? raw : null
}

// The list's address for a sort, an optional genre filter and an optional selected book.
export function longListPath({ sort, genre, book }: { sort: LongListSort; genre: string | null; book?: string }): string {
  const params = new URLSearchParams({ sort })
  if (genre) params.set('genre', genre)
  if (book) params.set('book', book)
  return `/long-list?${params.toString()}`
}

// The summary line while a genre filter is on, e.g. "3 Fantasy books · 12 suggested in all".
export function filteredSummary(shown: number, total: number, genre: string): string {
  return `${shown} ${genre} ${shown === 1 ? 'book' : 'books'} · ${total} suggested in all`
}
