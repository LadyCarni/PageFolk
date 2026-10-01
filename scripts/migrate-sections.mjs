// One-off backfill for the progress-and-unlocking change.
//
// Run it BEFORE pushing the new schema to an existing database:
//   npm run db:backfill-chapters
//   npx prisma db push --accept-data-loss     (drops Section.label, creates ReadingProgress)
//
// It adds the new Section/Book columns, fills them from existing "Chapters 11-20"
// style labels, and sets each book's totalChapters to its highest end chapter.
// If any label cannot be read it aborts before changing anything.
import { PrismaClient } from '@prisma/client'
import { pathToFileURL } from 'node:url'

export function parseChapterLabel(label) {
  const prefix = String.raw`^\s*(?:chapters?|chs?\.?)\s*`
  const range = new RegExp(`${prefix}(\\d+)\\s*(?:-|–|—|to)\\s*(\\d+)\\s*$`, 'i').exec(label)
  const single = new RegExp(`${prefix}(\\d+)\\s*$`, 'i').exec(label)
  const match = range ?? single
  if (!match) return null
  const startChapter = Number(match[1])
  const endChapter = Number(match[2] ?? match[1])
  if (startChapter < 1 || endChapter < startChapter) return null
  return { startChapter, endChapter }
}

export function planBackfill(sections) {
  const updates = []
  const errors = []
  const totals = {}
  for (const section of sections) {
    const parsed = parseChapterLabel(section.label)
    if (!parsed) {
      errors.push(`Section ${section.id} (book ${section.bookId}): cannot read chapters from label "${section.label}"`)
      continue
    }
    updates.push({ id: section.id, ...parsed })
    totals[section.bookId] = Math.max(totals[section.bookId] ?? 0, parsed.endChapter)
  }
  return { updates, totals, errors }
}

async function columnNames(prisma, table) {
  const rows = await prisma.$queryRawUnsafe(`PRAGMA table_info("${table}")`)
  return rows.map((row) => row.name)
}

export async function migrate(prisma) {
  const sectionColumns = await columnNames(prisma, 'Section')
  if (!sectionColumns.includes('label')) {
    console.log('Section.label is already gone; nothing to do.')
    return
  }

  const sections = await prisma.$queryRawUnsafe('SELECT id, bookId, label FROM "Section"')
  const { updates, totals, errors } = planBackfill(sections)
  if (errors.length > 0) {
    throw new Error(`Migration aborted, nothing was changed:\n${errors.join('\n')}`)
  }

  const bookColumns = await columnNames(prisma, 'Book')
  if (!sectionColumns.includes('startChapter')) {
    await prisma.$executeRawUnsafe('ALTER TABLE "Section" ADD COLUMN "startChapter" INTEGER NOT NULL DEFAULT 0')
  }
  if (!sectionColumns.includes('endChapter')) {
    await prisma.$executeRawUnsafe('ALTER TABLE "Section" ADD COLUMN "endChapter" INTEGER NOT NULL DEFAULT 0')
  }
  if (!sectionColumns.includes('title')) {
    await prisma.$executeRawUnsafe('ALTER TABLE "Section" ADD COLUMN "title" TEXT')
  }
  if (!bookColumns.includes('totalChapters')) {
    await prisma.$executeRawUnsafe('ALTER TABLE "Book" ADD COLUMN "totalChapters" INTEGER NOT NULL DEFAULT 0')
  }

  await prisma.$transaction([
    ...updates.map((u) =>
      prisma.$executeRawUnsafe(
        'UPDATE "Section" SET "startChapter" = ?, "endChapter" = ? WHERE "id" = ?',
        u.startChapter,
        u.endChapter,
        u.id
      )
    ),
    ...Object.entries(totals).map(([bookId, total]) =>
      prisma.$executeRawUnsafe('UPDATE "Book" SET "totalChapters" = ? WHERE "id" = ?', total, bookId)
    ),
  ])

  console.log(`Backfilled ${updates.length} section(s) across ${Object.keys(totals).length} book(s).`)
  const empty = await prisma.$queryRawUnsafe('SELECT title FROM "Book" WHERE "totalChapters" = 0')
  for (const book of empty) {
    console.warn(`"${book.title}" has no sections, so its total chapters is 0. Set it in the admin page.`)
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  const prisma = new PrismaClient()
  migrate(prisma)
    .catch((error) => {
      console.error(error.message)
      process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())
}
