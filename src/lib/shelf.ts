import { prisma } from '@/lib/db'
import { clampProgress } from '@/lib/chapters'
import { getSectionsForViewer } from '@/lib/sections'
import { orderShelf, type ShelfBook } from '@/lib/shelf-view'

// Every past book with what the shelf grid and preview need, already in shelf order.
export async function getShelf(userId: string): Promise<ShelfBook[]> {
  const books = await prisma.book.findMany({
    where: { status: 'past' },
    include: {
      // Only the timestamp, never the image bytes; it doubles as a cache-busting version.
      cover: { select: { updatedAt: true } },
      progress: { where: { userId }, select: { chaptersFinished: true } },
    },
  })

  return Promise.all(
    orderShelf(books).map(async (book): Promise<ShelfBook> => {
      const sections = await getSectionsForViewer(book.id, userId)
      const finished = clampProgress(book.progress[0]?.chaptersFinished ?? 0, book.totalChapters)
      return {
        id: book.id,
        title: book.title,
        author: book.author,
        blurb: book.blurb,
        genre: book.genre,
        totalChapters: book.totalChapters,
        coverVersion: book.cover?.updatedAt.getTime() ?? null,
        readMonth: book.readMonth,
        finished,
        read: finished === book.totalChapters,
        sections,
        openNotes: sections.reduce((sum, s) => (s.status === 'unlocked' ? sum + s.postCount : sum), 0),
      }
    })
  )
}
