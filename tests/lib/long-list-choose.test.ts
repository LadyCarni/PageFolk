import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { chooseLongListBook } from '@/lib/long-list'

describe('chooseLongListBook', () => {
  let userId: string
  let otherId: string

  beforeEach(async () => {
    await prisma.longListVote.deleteMany()
    await prisma.longListBook.deleteMany()
    await prisma.readingProgress.deleteMany()
    await prisma.post.deleteMany()
    await prisma.threadMembership.deleteMany()
    await prisma.section.deleteMany()
    await prisma.bookCover.deleteMany()
    await prisma.chapterName.deleteMany()
    await prisma.book.deleteMany()
    await prisma.user.deleteMany()
    userId = (await prisma.user.create({ data: { googleId: 'g-c1', email: 'c1@example.com', name: 'Cee' } })).id
    otherId = (await prisma.user.create({ data: { googleId: 'g-c2', email: 'c2@example.com', name: 'Dee' } })).id
  })

  async function suggest() {
    const s = await prisma.longListBook.create({
      data: { title: 'Dune', author: 'Frank Herbert', synopsis: 'Sand.', genre: 'Science fiction', suggestedById: userId },
    })
    await prisma.longListVote.create({ data: { bookId: s.id, userId } })
    await prisma.longListVote.create({ data: { bookId: s.id, userId: otherId } })
    return s
  }

  it('choosing creates a current book when none is current, with blurb and genre copied, and removes the suggestion and its votes', async () => {
    const s = await suggest()
    const { bookId } = await chooseLongListBook(s.id, 12)
    const book = await prisma.book.findUniqueOrThrow({ where: { id: bookId } })
    expect(book).toMatchObject({ title: 'Dune', author: 'Frank Herbert', totalChapters: 12, status: 'current', blurb: 'Sand.', genre: 'Science fiction' })
    expect(await prisma.longListBook.count()).toBe(0)
    expect(await prisma.longListVote.count()).toBe(0)
  })

  it('choosing creates an upcoming book when one is already current', async () => {
    await prisma.book.create({ data: { title: 'Other', author: 'A', totalChapters: 3, status: 'current' } })
    const s = await suggest()
    const { bookId } = await chooseLongListBook(s.id, 5)
    expect((await prisma.book.findUniqueOrThrow({ where: { id: bookId } })).status).toBe('upcoming')
  })

  it('invalid chapters (0) leave the suggestion and votes in place and create no book', async () => {
    const s = await suggest()
    await expect(chooseLongListBook(s.id, 0)).rejects.toThrow('Total chapters must be a whole number of at least 1')
    expect(await prisma.longListBook.count()).toBe(1)
    expect(await prisma.longListVote.count()).toBe(2)
    expect(await prisma.book.count()).toBe(0)
  })

  it('choosing a missing suggestion gives the gone message', async () => {
    await expect(chooseLongListBook('nope', 5)).rejects.toThrow('That book is no longer on the Long List')
  })
})
