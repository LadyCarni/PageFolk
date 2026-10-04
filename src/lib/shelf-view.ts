import type { SectionSummary } from '@/lib/sections'

// One past book as the shelf and its preview show it. Kept free of Prisma so client components can import it.
export type ShelfBook = {
  id: string
  title: string
  author: string
  blurb: string | null
  totalChapters: number
  coverVersion: number | null
  readMonth: string | null
  finished: number
  read: boolean
  sections: SectionSummary[]
  openNotes: number
}

type Progress = Pick<ShelfBook, 'read' | 'finished' | 'totalChapters'>

export function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

// Books with a read month first, newest month first; then the rest, newest added first.
export function orderShelf<T extends { readMonth: string | null; createdAt: Date }>(books: T[]): T[] {
  return [...books].sort((a, b) => {
    if (a.readMonth && b.readMonth && a.readMonth !== b.readMonth) return a.readMonth < b.readMonth ? 1 : -1
    if (a.readMonth && !b.readMonth) return -1
    if (!a.readMonth && b.readMonth) return 1
    return b.createdAt.getTime() - a.createdAt.getTime()
  })
}

export function shelfSummary(total: number, read: number): string {
  const books = `${plural(total, 'book')} finished together.`
  if (total === 1) return `${books} ${read ? 'You have read it.' : "You haven't finished it yet."}`
  return `${books} ${read ? `You have read ${read} of them.` : "You haven't finished any yet."}`
}

// The book to preview: the requested one when it is on the shelf, otherwise the first.
export function pickShelfBook(books: { id: string }[], requestedId: string | undefined): string | null {
  return books.find((book) => book.id === requestedId)?.id ?? books[0]?.id ?? null
}

export function statusLabel({ read, finished, totalChapters }: Progress): string {
  if (read) return 'You have read this'
  return finished > 0 ? `${finished} of ${totalChapters} chapters read` : 'Not started'
}

export function conversationsSubline({ read, finished, totalChapters }: Progress): string {
  if (read) return 'You have finished this book, so every thread is open.'
  return finished > 0 ? `You have read ${finished} of ${totalChapters} chapters.` : "You haven't started this book."
}

export function sealedLabel(chaptersToGo: number): string {
  return chaptersToGo > 0 ? `Sealed · ${plural(chaptersToGo, 'chapter')} to go` : 'Sealed'
}
