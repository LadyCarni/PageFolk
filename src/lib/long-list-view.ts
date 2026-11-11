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
  return `${count} ${count === 1 ? 'book' : 'books'} suggested · vote for as many as you like`
}

export function voteLabel(count: number): string {
  return `${count} ${count === 1 ? 'vote' : 'votes'}`
}
