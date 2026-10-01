import { prisma } from '@/lib/db'
import { validateChapterRange, validateTotalChapters } from '@/lib/chapters'
import { syncUnlocksForBook } from '@/lib/progress'

type SectionInput = { startChapter: number; endChapter: number; title?: string | null }

function cleanTitle(title: string | null | undefined): string | null {
  const trimmed = title?.trim()
  return trimmed ? trimmed : null
}

export async function listBooks(status?: 'current' | 'past') {
  return prisma.book.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    include: {
      sections: {
        orderBy: { order: 'asc' },
        include: { _count: { select: { posts: true } } },
      },
      // Only the timestamp, never the image bytes; it doubles as a cache-busting version.
      cover: { select: { updatedAt: true } },
    },
  })
}

export async function createBook(input: { title: string; author: string; totalChapters: number; coverUrl?: string }) {
  const problem = validateTotalChapters(input.totalChapters)
  if (problem) throw new Error(problem)
  return prisma.book.create({ data: { ...input, status: 'current' } })
}

export async function addSection(bookId: string, input: SectionInput) {
  const book = await prisma.book.findUniqueOrThrow({ where: { id: bookId } })
  const problem = validateChapterRange({
    startChapter: input.startChapter,
    endChapter: input.endChapter,
    totalChapters: book.totalChapters,
  })
  if (problem) throw new Error(problem)

  const { _max } = await prisma.section.aggregate({
    where: { bookId },
    _max: { order: true },
  })
  const order = (_max.order ?? 0) + 1
  const section = await prisma.section.create({
    data: {
      bookId,
      startChapter: input.startChapter,
      endChapter: input.endChapter,
      title: cleanTitle(input.title),
      order,
    },
  })
  await syncUnlocksForBook(bookId)
  return section
}

export async function setBookStatus(bookId: string, status: 'current' | 'past') {
  return prisma.book.update({ where: { id: bookId }, data: { status } })
}

export async function updateSection(sectionId: string, input: SectionInput) {
  const existing = await prisma.section.findUniqueOrThrow({ where: { id: sectionId }, include: { book: true } })
  const problem = validateChapterRange({
    startChapter: input.startChapter,
    endChapter: input.endChapter,
    totalChapters: existing.book.totalChapters,
  })
  if (problem) throw new Error(problem)

  const section = await prisma.section.update({
    where: { id: sectionId },
    data: {
      startChapter: input.startChapter,
      endChapter: input.endChapter,
      title: cleanTitle(input.title),
    },
  })
  await syncUnlocksForBook(existing.bookId)
  return section
}

export async function updateTotalChapters(bookId: string, totalChapters: number) {
  const problem = validateTotalChapters(totalChapters)
  if (problem) throw new Error(problem)

  const { _max } = await prisma.section.aggregate({ where: { bookId }, _max: { endChapter: true } })
  if (_max.endChapter !== null && totalChapters < _max.endChapter) {
    throw new Error(`Total chapters cannot be less than ${_max.endChapter}, where the last thread ends`)
  }
  return prisma.book.update({ where: { id: bookId }, data: { totalChapters } })
}

export async function deleteSection(sectionId: string): Promise<void> {
  await prisma.$transaction([
    prisma.post.deleteMany({ where: { sectionId } }),
    prisma.threadMembership.deleteMany({ where: { sectionId } }),
    prisma.section.delete({ where: { id: sectionId } }),
  ])
}

export async function deleteBook(bookId: string): Promise<void> {
  const sectionIds = (await prisma.section.findMany({ where: { bookId }, select: { id: true } })).map((s) => s.id)
  await prisma.$transaction([
    prisma.bookCover.deleteMany({ where: { bookId } }),
    prisma.post.deleteMany({ where: { sectionId: { in: sectionIds } } }),
    prisma.threadMembership.deleteMany({ where: { sectionId: { in: sectionIds } } }),
    prisma.readingProgress.deleteMany({ where: { bookId } }),
    prisma.section.deleteMany({ where: { bookId } }),
    prisma.book.delete({ where: { id: bookId } }),
  ])
}
