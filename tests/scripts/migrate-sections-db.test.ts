import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { rmSync } from 'node:fs'
import path from 'node:path'
import { migrate } from '../../scripts/migrate-sections.mjs'

// A throwaway SQLite file (git-ignored via *.db) seeded with the OLD schema.
const dbPath = path.resolve(__dirname, `../../prisma/migrate-test-${process.pid}.db`)
let db: PrismaClient

async function seedOldSchema(labels: string[]) {
  await db.$executeRawUnsafe('CREATE TABLE "Book" ("id" TEXT PRIMARY KEY, "title" TEXT NOT NULL)')
  await db.$executeRawUnsafe(
    'CREATE TABLE "Section" ("id" TEXT PRIMARY KEY, "bookId" TEXT NOT NULL, "label" TEXT NOT NULL, "order" INTEGER NOT NULL)'
  )
  await db.$executeRawUnsafe(`INSERT INTO "Book" VALUES ('b1', 'Dune'), ('b2', 'Empty Book')`)
  for (const [i, label] of labels.entries()) {
    await db.$executeRawUnsafe('INSERT INTO "Section" VALUES (?, ?, ?, ?)', `s${i + 1}`, 'b1', label, i + 1)
  }
}

async function sectionColumns() {
  const rows = (await db.$queryRawUnsafe('PRAGMA table_info("Section")')) as { name: string }[]
  return rows.map((r) => r.name)
}

async function sectionRanges() {
  const rows = (await db.$queryRawUnsafe(
    'SELECT "startChapter", "endChapter" FROM "Section" ORDER BY "order"'
  )) as { startChapter: unknown; endChapter: unknown }[]
  return rows.map((r) => [Number(r.startChapter), Number(r.endChapter)])
}

async function bookTotals() {
  const rows = (await db.$queryRawUnsafe('SELECT "id", "totalChapters" FROM "Book" ORDER BY "id"')) as {
    id: string
    totalChapters: unknown
  }[]
  return rows.map((r) => [r.id, Number(r.totalChapters)])
}

describe('migrate() against a real SQLite file', () => {
  let warn: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    rmSync(dbPath, { force: true })
    db = new PrismaClient({ datasourceUrl: `file:${dbPath}` })
    vi.spyOn(console, 'log').mockImplementation(() => {})
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await db.$disconnect()
    rmSync(dbPath, { force: true })
  })

  it('adds the new columns, fills ranges from labels, and sets each total to the highest end chapter', async () => {
    await seedOldSchema(['Chapters 1-10', 'Chapters 11-20'])

    await migrate(db)

    expect(await sectionRanges()).toEqual([
      [1, 10],
      [11, 20],
    ])
    expect(await bookTotals()).toEqual([
      ['b1', 20],
      ['b2', 0],
    ])
    expect(await sectionColumns()).toEqual(expect.arrayContaining(['startChapter', 'endChapter', 'title', 'label']))
  })

  it('warns about a book with no sections, whose total stays 0', async () => {
    await seedOldSchema(['Chapters 1-10'])

    await migrate(db)

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Empty Book'))
  })

  it('aborts on an unreadable label before changing anything', async () => {
    await seedOldSchema(['Chapters 1-10', 'The Gathering'])

    await expect(migrate(db)).rejects.toThrow('The Gathering')

    const columns = await sectionColumns()
    expect(columns).not.toContain('startChapter')
    expect(columns).not.toContain('endChapter')
  })

  it('is safe to run twice while label still exists', async () => {
    await seedOldSchema(['Chapters 1-10', 'Chapters 11-20'])

    await migrate(db)
    await migrate(db)

    expect(await sectionRanges()).toEqual([
      [1, 10],
      [11, 20],
    ])
    expect(await bookTotals()).toEqual([
      ['b1', 20],
      ['b2', 0],
    ])
  })

  it('does nothing once label is gone (after db push), leaving the data alone', async () => {
    await seedOldSchema(['Chapters 1-10'])
    await migrate(db)
    await db.$executeRawUnsafe('ALTER TABLE "Section" DROP COLUMN "label"')

    await migrate(db)

    expect(await sectionColumns()).not.toContain('label')
    expect(await sectionRanges()).toEqual([[1, 10]])
  })
})
