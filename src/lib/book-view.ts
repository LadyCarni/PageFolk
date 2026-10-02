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
