import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { getShelf } from '@/lib/shelf'
import { getSectionsForViewer } from '@/lib/sections'

async function makeBook(title: string, status: 'current' | 'past', extra: { readMonth?: string; totalChapters?: number } = {}) {
  return prisma.book.create({
    data: {
      title,
      author: 'Author',
      status,
      totalChapters: extra.totalChapters ?? 10,
      readMonth: extra.readMonth ?? null,
      sections: {
        create: [
          { startChapter: 1, endChapter: 5, order: 1 },
          { startChapter: 6, endChapter: 10, order: 2 },
        ],
      },
    },
    include: { sections: { orderBy: { order: 'asc' } } },
  })
}

async function post(sectionId: string, userId: string, count: number) {
  for (let i = 0; i < count; i++) {
    await prisma.post.create({ data: { sectionId, userId, body: `note ${i}` } })
  }
}

describe('getShelf', () => {
  beforeEach(async () => {
    await prisma.readingProgress.deleteMany()
    await prisma.post.deleteMany()
    await prisma.threadMembership.deleteMany()
    await prisma.bookCover.deleteMany()
    await prisma.section.deleteMany()
    await prisma.book.deleteMany()
    await prisma.user.deleteMany()
  })

  it('returns only past books, dated ones first', async () => {
    const user = await prisma.user.create({ data: { googleId: 'g-s1', email: 's1@example.com', name: 'Reader' } })
    await makeBook('Current', 'current')
    await makeBook('Undated', 'past')
    await makeBook('September', 'past', { readMonth: '2026-09' })

    const shelf = await getShelf(user.id)

    expect(shelf.map((b) => b.title)).toEqual(['September', 'Undated'])
    expect(shelf[0]).toMatchObject({ readMonth: '2026-09', coverVersion: null, totalChapters: 10, blurb: null, genre: null })
  })

  it('marks a book read only when every chapter is finished, and clamps progress past the total', async () => {
    const user = await prisma.user.create({ data: { googleId: 'g-s2', email: 's2@example.com', name: 'Reader' } })
    const partial = await makeBook('Partial', 'past', { readMonth: '2026-09' })
    const over = await makeBook('Over', 'past', { readMonth: '2026-08' })
    await prisma.readingProgress.create({ data: { userId: user.id, bookId: partial.id, chaptersFinished: 9 } })
    await prisma.readingProgress.create({ data: { userId: user.id, bookId: over.id, chaptersFinished: 40 } })

    const [p, o] = await getShelf(user.id)

    expect(p).toMatchObject({ title: 'Partial', finished: 9, read: false })
    expect(o).toMatchObject({ title: 'Over', finished: 10, read: true })
  })

  it('shows sections exactly as the book page does, and counts notes only in open ones', async () => {
    const user = await prisma.user.create({ data: { googleId: 'g-s3', email: 's3@example.com', name: 'Reader' } })
    const book = await makeBook('Book', 'past')
    const [first, second] = book.sections
    await prisma.readingProgress.create({ data: { userId: user.id, bookId: book.id, chaptersFinished: 5 } })
    await prisma.threadMembership.create({ data: { userId: user.id, sectionId: first.id } })
    await post(first.id, user.id, 3)
    await post(second.id, user.id, 4)

    const [entry] = await getShelf(user.id)

    expect(entry.sections).toEqual(await getSectionsForViewer(book.id, user.id))
    expect(entry.sections.map((s) => s.status)).toEqual(['unlocked', 'locked'])
    expect(entry.openNotes).toBe(3)
  })

  it('keeps sections open after progress is lowered, without calling the book read', async () => {
    const user = await prisma.user.create({ data: { googleId: 'g-s4', email: 's4@example.com', name: 'Reader' } })
    const book = await makeBook('Lowered', 'past')
    for (const section of book.sections) {
      await prisma.threadMembership.create({ data: { userId: user.id, sectionId: section.id } })
      await post(section.id, user.id, 2)
    }
    await prisma.readingProgress.create({ data: { userId: user.id, bookId: book.id, chaptersFinished: 3 } })

    const [entry] = await getShelf(user.id)

    expect(entry.read).toBe(false)
    expect(entry.sections.every((s) => s.status === 'unlocked')).toBe(true)
    expect(entry.openNotes).toBe(4)
  })
})
