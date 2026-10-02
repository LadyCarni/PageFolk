import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { getBookView } from '@/lib/book-view'

async function setup() {
  const book = await prisma.book.create({
    data: {
      title: 'Jane Eyre',
      author: 'Charlotte Brontë',
      blurb: 'An orphaned girl.',
      totalChapters: 38,
      sections: {
        create: [
          { startChapter: 1, endChapter: 5, order: 1, title: 'Gateshead' },
          { startChapter: 6, endChapter: 10, order: 2, title: 'Lowood' },
          { startChapter: 11, endChapter: 15, order: 3, title: 'Thornfield' },
        ],
      },
    },
    include: { sections: { orderBy: { order: 'asc' } } },
  })
  const user = await prisma.user.create({ data: { googleId: 'g-bv', email: 'bv@example.com', name: 'Reader' } })
  return { book, user, ids: book.sections.map((s) => s.id) }
}

async function unlock(userId: string, sectionId: string) {
  await prisma.threadMembership.create({ data: { userId, sectionId } })
}

describe('getBookView', () => {
  beforeEach(async () => {
    await prisma.readingProgress.deleteMany()
    await prisma.post.deleteMany()
    await prisma.threadMembership.deleteMany()
    await prisma.bookCover.deleteMany()
    await prisma.section.deleteMany()
    await prisma.book.deleteMany()
    await prisma.user.deleteMany()
  })

  it('returns null for an unknown book', async () => {
    const { user } = await setup()
    expect(await getBookView('nope', user.id)).toBeNull()
  })

  it('returns the book details, blurb and progress', async () => {
    const { book, user } = await setup()
    await prisma.readingProgress.create({ data: { userId: user.id, bookId: book.id, chaptersFinished: 12 } })

    const data = await getBookView(book.id, user.id)

    expect(data?.book).toEqual({
      id: book.id,
      title: 'Jane Eyre',
      author: 'Charlotte Brontë',
      blurb: 'An orphaned girl.',
      totalChapters: 38,
      coverVersion: null,
    })
    expect(data?.finished).toBe(12)
    expect(data?.sections).toHaveLength(3)
  })

  it('reports a cover version when the book has a cover', async () => {
    const { book, user } = await setup()
    const cover = await prisma.bookCover.create({
      data: { bookId: book.id, data: Buffer.from([1, 2, 3]), contentType: 'image/png' },
    })

    const data = await getBookView(book.id, user.id)

    expect(data?.book.coverVersion).toBe(cover.updatedAt.getTime())
  })

  it('defaults to the open thread with the highest order, not explicit', async () => {
    const { book, user, ids } = await setup()
    await unlock(user.id, ids[0])
    await unlock(user.id, ids[1])

    const data = await getBookView(book.id, user.id)

    expect(data?.selectedId).toBe(ids[1])
    expect(data?.explicit).toBe(false)
    expect(data?.thread?.title).toBe('Lowood')
    expect(data?.thread).toMatchObject({ startChapter: 6, endChapter: 10 })
  })

  it('selects a requested open thread and marks it explicit', async () => {
    const { book, user, ids } = await setup()
    await unlock(user.id, ids[0])
    await unlock(user.id, ids[1])

    const data = await getBookView(book.id, user.id, ids[0])

    expect(data?.selectedId).toBe(ids[0])
    expect(data?.explicit).toBe(true)
    expect(data?.thread?.title).toBe('Gateshead')
  })

  it('ignores a requested sealed thread and reveals nothing about it', async () => {
    const { book, user, ids } = await setup()
    await unlock(user.id, ids[0])
    await unlock(user.id, ids[1])
    const author = await prisma.user.create({ data: { googleId: 'g-a', email: 'a@example.com' } })
    await prisma.post.create({ data: { sectionId: ids[2], userId: author.id, body: 'Secret ending' } })

    const data = await getBookView(book.id, user.id, ids[2])

    expect(data?.selectedId).toBe(ids[1])
    expect(data?.explicit).toBe(false)
    const text = JSON.stringify(data)
    expect(text).not.toContain('Thornfield')
    expect(text).not.toContain('Secret ending')
  })

  it('ignores an unknown thread id', async () => {
    const { book, user, ids } = await setup()
    await unlock(user.id, ids[0])

    const data = await getBookView(book.id, user.id, 'does-not-exist')

    expect(data?.selectedId).toBe(ids[0])
    expect(data?.explicit).toBe(false)
  })

  it('selects nothing, with no thread, when the reader has no open threads', async () => {
    const { book, user } = await setup()

    const data = await getBookView(book.id, user.id)

    expect(data?.selectedId).toBeNull()
    expect(data?.thread).toBeNull()
    expect(data?.sections.every((s) => s.status === 'locked')).toBe(true)
  })

  it('works for a book with no threads at all', async () => {
    const book = await prisma.book.create({ data: { title: 'Empty', author: 'Nobody', totalChapters: 10 } })
    const user = await prisma.user.create({ data: { googleId: 'g-e', email: 'e@example.com' } })

    const data = await getBookView(book.id, user.id)

    expect(data?.sections).toEqual([])
    expect(data?.selectedId).toBeNull()
  })
})
