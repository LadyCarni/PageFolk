import type { Prisma, PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/db'
import { clampProgress } from '@/lib/chapters'

export async function getProgress(userId: string, bookId: string): Promise<number> {
  const [book, row] = await Promise.all([
    prisma.book.findUniqueOrThrow({ where: { id: bookId }, select: { totalChapters: true } }),
    prisma.readingProgress.findUnique({ where: { userId_bookId: { userId, bookId } } }),
  ])
  return clampProgress(row?.chaptersFinished ?? 0, book.totalChapters)
}

// Saves the reader's number and unlocks every thread whose last chapter they have reached.
// Memberships are only ever added here, so lowering the number never re-seals a thread.
export async function setProgress(userId: string, bookId: string, chaptersFinished: number): Promise<number> {
  const book = await prisma.book.findUniqueOrThrow({ where: { id: bookId }, select: { totalChapters: true } })
  const value = clampProgress(chaptersFinished, book.totalChapters)

  await prisma.$transaction(async (tx) => {
    await tx.readingProgress.upsert({
      where: { userId_bookId: { userId, bookId } },
      update: { chaptersFinished: value },
      create: { userId, bookId, chaptersFinished: value },
    })
    const reached = await tx.section.findMany({
      where: { bookId, endChapter: { lte: value } },
      select: { id: true },
    })
    for (const section of reached) {
      await tx.threadMembership.upsert({
        where: { userId_sectionId: { userId, sectionId: section.id } },
        update: {},
        create: { userId, sectionId: section.id },
      })
    }
  })

  return value
}

type Db = PrismaClient | Prisma.TransactionClient

// Re-runs the unlock check for everyone with progress in this book. Call it after the
// admin adds or edits a section so readers who are already far enough along get it.
// Pass a transaction client to make the check commit or roll back with the caller's write.
export async function syncUnlocksForBook(bookId: string, db: Db = prisma): Promise<void> {
  const book = await db.book.findUniqueOrThrow({
    where: { id: bookId },
    select: {
      totalChapters: true,
      sections: { select: { id: true, endChapter: true } },
      progress: { select: { userId: true, chaptersFinished: true } },
    },
  })

  for (const row of book.progress) {
    const finished = clampProgress(row.chaptersFinished, book.totalChapters)
    for (const section of book.sections) {
      if (section.endChapter > finished) continue
      await db.threadMembership.upsert({
        where: { userId_sectionId: { userId: row.userId, sectionId: section.id } },
        update: {},
        create: { userId: row.userId, sectionId: section.id },
      })
    }
  }
}
