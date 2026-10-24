import { prisma } from '@/lib/db'
import { ValidationError } from '@/lib/errors'
import { validateChapterName } from '@/lib/limits'

// A book's chapter names, keyed by 1-based chapter number. Unnamed chapters are absent.
export async function getChapterNames(bookId: string): Promise<Record<number, string>> {
  const rows = await prisma.chapterName.findMany({ where: { bookId } })
  return Object.fromEntries(rows.map((row) => [row.number, row.name]))
}

// Replaces all of a book's names. Blank names are dropped, so clearing a row unnames that chapter.
export async function setChapterNames(bookId: string, names: Record<number, string>): Promise<void> {
  const book = await prisma.book.findUniqueOrThrow({ where: { id: bookId } })
  const rows: { bookId: string; number: number; name: string }[] = []
  for (const [key, raw] of Object.entries(names)) {
    const number = Number(key)
    if (!Number.isInteger(number) || number < 1 || number > book.totalChapters) {
      throw new ValidationError(`Chapter numbers must be from 1 to ${book.totalChapters}`)
    }
    const problem = validateChapterName(raw)
    if (problem) throw new ValidationError(problem)
    const name = raw.trim()
    if (name) rows.push({ bookId, number, name })
  }
  await prisma.$transaction([
    prisma.chapterName.deleteMany({ where: { bookId } }),
    prisma.chapterName.createMany({ data: rows }),
  ])
}

export async function highestNamedChapter(bookId: string): Promise<number> {
  const { _max } = await prisma.chapterName.aggregate({ where: { bookId }, _max: { number: true } })
  return _max.number ?? 0
}
