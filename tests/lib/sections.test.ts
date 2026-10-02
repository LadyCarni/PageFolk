import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { getSectionBookId, getSectionsForViewer, getSectionThread } from '@/lib/sections'

async function resetDb() {
  await prisma.readingProgress.deleteMany()
  await prisma.post.deleteMany()
  await prisma.threadMembership.deleteMany()
  await prisma.section.deleteMany()
  await prisma.book.deleteMany()
  await prisma.user.deleteMany()
}

async function unlock(userId: string, sectionId: string) {
  await prisma.threadMembership.create({ data: { userId, sectionId } })
}

describe('getSectionsForViewer', () => {
  beforeEach(resetDb)

  it('returns a sealed section as only its range and chapters to go, with no title, posts or label', async () => {
    const book = await prisma.book.create({
      data: {
        title: 'Dune',
        author: 'Herbert',
        totalChapters: 30,
        sections: { create: [{ startChapter: 11, endChapter: 15, title: 'Lowood', order: 1 }] },
      },
      include: { sections: true },
    })
    const author = await prisma.user.create({ data: { googleId: 'g-1', email: 'author@example.com' } })
    const viewer = await prisma.user.create({ data: { googleId: 'g-2', email: 'viewer@example.com' } })
    await prisma.post.create({ data: { sectionId: book.sections[0].id, userId: author.id, body: 'Spoiler!' } })

    const summaries = await getSectionsForViewer(book.id, viewer.id)

    expect(summaries).toEqual([
      { id: book.sections[0].id, order: 1, status: 'locked', startChapter: 11, endChapter: 15, chaptersToGo: 15 },
    ])
    for (const leaked of ['title', 'label', 'name', 'posts', 'postCount', 'lastPostAt']) {
      expect(summaries[0]).not.toHaveProperty(leaked)
    }
    expect(JSON.stringify(summaries)).not.toContain('Lowood')
  })

  it("counts chapters to go from the viewer's progress", async () => {
    const book = await prisma.book.create({
      data: {
        title: 'Dune',
        author: 'Herbert',
        totalChapters: 30,
        sections: { create: [{ startChapter: 21, endChapter: 25, order: 1 }] },
      },
    })
    const viewer = await prisma.user.create({ data: { googleId: 'g-go', email: 'go@example.com' } })
    await prisma.readingProgress.create({ data: { userId: viewer.id, bookId: book.id, chaptersFinished: 12 } })

    const [summary] = await getSectionsForViewer(book.id, viewer.id)

    expect(summary).toMatchObject({ status: 'locked', chaptersToGo: 13 })
  })

  it('reports the newest post time as lastPostAt for unlocked sections, and null when there are no posts', async () => {
    const book = await prisma.book.create({
      data: {
        title: 'Dune',
        author: 'Herbert',
        totalChapters: 30,
        sections: {
          create: [
            { startChapter: 1, endChapter: 5, order: 1 },
            { startChapter: 6, endChapter: 10, order: 2 },
          ],
        },
      },
      include: { sections: { orderBy: { order: 'asc' } } },
    })
    const viewer = await prisma.user.create({ data: { googleId: 'g-last', email: 'last@example.com' } })
    for (const section of book.sections) {
      await unlock(viewer.id, section.id)
    }
    const older = new Date('2026-01-01T00:00:00Z')
    const newer = new Date('2026-02-01T00:00:00Z')
    await prisma.post.create({ data: { sectionId: book.sections[0].id, userId: viewer.id, body: 'a', createdAt: newer } })
    await prisma.post.create({ data: { sectionId: book.sections[0].id, userId: viewer.id, body: 'b', createdAt: older } })

    const [withPosts, empty] = await getSectionsForViewer(book.id, viewer.id)

    expect(withPosts).toMatchObject({ postCount: 2, lastPostAt: newer })
    expect(empty).toMatchObject({ postCount: 0, lastPostAt: null })
  })

  it('returns an unlocked section with its title and post count', async () => {
    const book = await prisma.book.create({
      data: {
        title: 'Dune',
        author: 'Herbert',
        totalChapters: 30,
        sections: { create: [{ startChapter: 1, endChapter: 5, title: 'Gateshead', order: 1 }] },
      },
      include: { sections: true },
    })
    const viewer = await prisma.user.create({ data: { googleId: 'g-3', email: 'viewer2@example.com' } })
    await unlock(viewer.id, book.sections[0].id)
    const post = await prisma.post.create({ data: { sectionId: book.sections[0].id, userId: viewer.id, body: 'Hi' } })

    const summaries = await getSectionsForViewer(book.id, viewer.id)

    expect(summaries[0]).toEqual({
      id: book.sections[0].id,
      order: 1,
      status: 'unlocked',
      startChapter: 1,
      endChapter: 5,
      title: 'Gateshead',
      postCount: 1,
      lastPostAt: post.createdAt,
    })
  })

  it('orders sections by their order field', async () => {
    const book = await prisma.book.create({
      data: {
        title: 'Dune',
        author: 'Herbert',
        totalChapters: 30,
        sections: {
          create: [
            { startChapter: 6, endChapter: 10, order: 2 },
            { startChapter: 1, endChapter: 5, order: 1 },
          ],
        },
      },
    })
    const viewer = await prisma.user.create({ data: { googleId: 'g-4', email: 'viewer3@example.com' } })

    const summaries = await getSectionsForViewer(book.id, viewer.id)

    expect(summaries.map((s) => s.startChapter)).toEqual([1, 6])
  })
})

describe('getSectionThread', () => {
  beforeEach(resetDb)

  async function setup() {
    const book = await prisma.book.create({
      data: {
        title: 'Dune',
        author: 'Herbert',
        totalChapters: 30,
        sections: { create: [{ startChapter: 6, endChapter: 10, title: 'Lowood', order: 1 }] },
      },
      include: { sections: true },
    })
    return book.sections[0].id
  }

  it('returns only the status when the viewer has not unlocked the thread', async () => {
    const sectionId = await setup()
    const author = await prisma.user.create({ data: { googleId: 'g-7', email: 'author2@example.com' } })
    const viewer = await prisma.user.create({ data: { googleId: 'g-8', email: 'viewer4@example.com' } })
    await prisma.post.create({ data: { sectionId, userId: author.id, body: 'Spoiler!' } })

    const result = await getSectionThread(sectionId, viewer.id)

    expect(result).toEqual({ status: 'locked' })
    expect(JSON.stringify(result)).not.toContain('Lowood')
  })

  it('returns the display name and posts once the thread is unlocked', async () => {
    const sectionId = await setup()
    const viewer = await prisma.user.create({ data: { googleId: 'g-9', email: 'viewer5@example.com' } })
    await unlock(viewer.id, sectionId)
    await prisma.post.create({ data: { sectionId, userId: viewer.id, body: 'Hi all' } })

    const result = await getSectionThread(sectionId, viewer.id)

    expect(result.status).toBe('unlocked')
    if (result.status === 'unlocked') {
      expect(result.name).toBe('Chapters 6 to 10 · Lowood')
      expect(result.posts).toHaveLength(1)
      expect(result.posts[0].body).toBe('Hi all')
      expect(result.title).toBe('Lowood')
      expect(result.startChapter).toBe(6)
      expect(result.endChapter).toBe(10)
    }
  })

  it('finds the book a section belongs to, or null when it does not exist', async () => {
    const sectionId = await setup()
    const section = await prisma.section.findUniqueOrThrow({ where: { id: sectionId } })

    expect(await getSectionBookId(sectionId)).toBe(section.bookId)
    expect(await getSectionBookId('does-not-exist')).toBeNull()
  })
})
