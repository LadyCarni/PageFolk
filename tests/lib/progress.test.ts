import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { getProgress, setProgress, syncUnlocksForBook } from '@/lib/progress'

async function setup() {
  const book = await prisma.book.create({
    data: {
      title: 'Jane Eyre',
      author: 'Charlotte Brontë',
      totalChapters: 38,
      sections: {
        create: [
          { startChapter: 1, endChapter: 5, order: 1 },
          { startChapter: 6, endChapter: 10, order: 2 },
          { startChapter: 11, endChapter: 15, order: 3 },
        ],
      },
    },
    include: { sections: { orderBy: { order: 'asc' } } },
  })
  const user = await prisma.user.create({ data: { googleId: 'g-prog', email: 'prog@example.com' } })
  return { book, user }
}

async function unlockedSectionIds(userId: string) {
  const rows = await prisma.threadMembership.findMany({ where: { userId } })
  return rows.map((r) => r.sectionId).sort()
}

describe('progress', () => {
  beforeEach(async () => {
    await prisma.readingProgress.deleteMany()
    await prisma.post.deleteMany()
    await prisma.threadMembership.deleteMany()
    await prisma.section.deleteMany()
    await prisma.book.deleteMany()
    await prisma.user.deleteMany()
  })

  it('unlocks exactly the sections whose last chapter is at or below the number', async () => {
    const { book, user } = await setup()

    const saved = await setProgress(user.id, book.id, 10)

    expect(saved).toBe(10)
    expect(await unlockedSectionIds(user.id)).toEqual([book.sections[0].id, book.sections[1].id].sort())
  })

  it('does not unlock a section the reader is only partway through', async () => {
    const { book, user } = await setup()

    await setProgress(user.id, book.id, 14)

    expect(await unlockedSectionIds(user.id)).toEqual([book.sections[0].id, book.sections[1].id].sort())
  })

  it('keeps threads open when the number is lowered', async () => {
    const { book, user } = await setup()
    await setProgress(user.id, book.id, 12)

    await setProgress(user.id, book.id, 3)

    expect(await getProgress(user.id, book.id)).toBe(3)
    expect(await unlockedSectionIds(user.id)).toEqual([book.sections[0].id, book.sections[1].id].sort())
  })

  it('clamps to 0..totalChapters, floors fractions, and turns NaN into 0', async () => {
    const { book, user } = await setup()

    expect(await setProgress(user.id, book.id, 99)).toBe(38)
    expect(await setProgress(user.id, book.id, -3)).toBe(0)
    expect(await setProgress(user.id, book.id, 2.7)).toBe(2)
    expect(await setProgress(user.id, book.id, NaN)).toBe(0)
    expect(await getProgress(user.id, book.id)).toBe(0)
  })

  it('is idempotent: saving the same number twice keeps one progress row and no duplicate memberships', async () => {
    const { book, user } = await setup()

    await setProgress(user.id, book.id, 10)
    await setProgress(user.id, book.id, 10)

    expect(await prisma.readingProgress.count()).toBe(1)
    expect(await prisma.threadMembership.count()).toBe(2)
  })

  it('reads as 0 for a reader with no progress row', async () => {
    const { book, user } = await setup()
    expect(await getProgress(user.id, book.id)).toBe(0)
  })

  it('clamps what it reads when the admin has since lowered the total', async () => {
    const { book, user } = await setup()
    await prisma.readingProgress.create({ data: { userId: user.id, bookId: book.id, chaptersFinished: 30 } })
    await prisma.book.update({ where: { id: book.id }, data: { totalChapters: 20 } })

    expect(await getProgress(user.id, book.id)).toBe(20)
  })

  it('keeps progress per book', async () => {
    const { book, user } = await setup()
    const other = await prisma.book.create({ data: { title: 'Emma', author: 'Austen', totalChapters: 55 } })

    await setProgress(user.id, book.id, 12)

    expect(await getProgress(user.id, other.id)).toBe(0)
  })

  it('syncUnlocksForBook unlocks a new section for readers who are already far enough along, and only them', async () => {
    const { book, user } = await setup()
    const behind = await prisma.user.create({ data: { googleId: 'g-behind', email: 'behind@example.com' } })
    await setProgress(user.id, book.id, 12)
    await setProgress(behind.id, book.id, 3)
    const added = await prisma.section.create({
      data: { bookId: book.id, startChapter: 8, endChapter: 12, order: 4 },
    })

    await syncUnlocksForBook(book.id)

    expect(await unlockedSectionIds(user.id)).toContain(added.id)
    expect(await unlockedSectionIds(behind.id)).not.toContain(added.id)
  })
})
