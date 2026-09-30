import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { getSectionsForViewer, joinSection, getSectionThread } from '@/lib/sections'

describe('getSectionsForViewer', () => {
  beforeEach(async () => {
    await prisma.post.deleteMany()
    await prisma.threadMembership.deleteMany()
    await prisma.section.deleteMany()
    await prisma.book.deleteMany()
    await prisma.user.deleteMany()
  })

  it('marks a section the viewer has not joined as locked, with no postCount', async () => {
    const book = await prisma.book.create({
      data: { title: 'Dune', author: 'Herbert', sections: { create: [{ label: 'Ch 1-5', order: 1 }] } },
      include: { sections: true },
    })
    const author = await prisma.user.create({ data: { googleId: 'g-1', email: 'author@example.com' } })
    const viewer = await prisma.user.create({ data: { googleId: 'g-2', email: 'viewer@example.com' } })
    await prisma.post.create({ data: { sectionId: book.sections[0].id, userId: author.id, body: 'Spoiler!' } })

    const summaries = await getSectionsForViewer(book.id, viewer.id)

    expect(summaries).toEqual([{ id: book.sections[0].id, label: 'Ch 1-5', order: 1, status: 'locked' }])
    expect(summaries[0]).not.toHaveProperty('postCount')
  })

  it('marks a joined section as unlocked with its post count', async () => {
    const book = await prisma.book.create({
      data: { title: 'Dune', author: 'Herbert', sections: { create: [{ label: 'Ch 1-5', order: 1 }] } },
      include: { sections: true },
    })
    const viewer = await prisma.user.create({ data: { googleId: 'g-3', email: 'viewer2@example.com' } })
    await prisma.threadMembership.create({ data: { userId: viewer.id, sectionId: book.sections[0].id } })
    await prisma.post.create({ data: { sectionId: book.sections[0].id, userId: viewer.id, body: 'Hi' } })

    const summaries = await getSectionsForViewer(book.id, viewer.id)

    expect(summaries[0]).toEqual({
      id: book.sections[0].id,
      label: 'Ch 1-5',
      order: 1,
      status: 'unlocked',
      postCount: 1,
    })
  })

  it('orders sections by their order field', async () => {
    const book = await prisma.book.create({
      data: {
        title: 'Dune',
        author: 'Herbert',
        sections: { create: [{ label: 'Ch 6-10', order: 2 }, { label: 'Ch 1-5', order: 1 }] },
      },
    })
    const viewer = await prisma.user.create({ data: { googleId: 'g-4', email: 'viewer3@example.com' } })

    const summaries = await getSectionsForViewer(book.id, viewer.id)

    expect(summaries.map((s) => s.label)).toEqual(['Ch 1-5', 'Ch 6-10'])
  })
})

describe('joinSection', () => {
  beforeEach(async () => {
    await prisma.post.deleteMany()
    await prisma.threadMembership.deleteMany()
    await prisma.section.deleteMany()
    await prisma.book.deleteMany()
    await prisma.user.deleteMany()
  })

  it('creates a membership that unlocks the section', async () => {
    const book = await prisma.book.create({
      data: { title: 'Dune', author: 'Herbert', sections: { create: [{ label: 'Ch 1-5', order: 1 }] } },
      include: { sections: true },
    })
    const user = await prisma.user.create({ data: { googleId: 'g-5', email: 'joiner@example.com' } })

    await joinSection(user.id, book.sections[0].id)

    const summaries = await getSectionsForViewer(book.id, user.id)
    expect(summaries[0].status).toBe('unlocked')
  })

  it('is idempotent — joining twice does not throw or duplicate the membership', async () => {
    const book = await prisma.book.create({
      data: { title: 'Dune', author: 'Herbert', sections: { create: [{ label: 'Ch 1-5', order: 1 }] } },
      include: { sections: true },
    })
    const user = await prisma.user.create({ data: { googleId: 'g-6', email: 'joiner2@example.com' } })

    await joinSection(user.id, book.sections[0].id)
    await joinSection(user.id, book.sections[0].id)

    const count = await prisma.threadMembership.count({
      where: { userId: user.id, sectionId: book.sections[0].id },
    })
    expect(count).toBe(1)
  })
})

describe('getSectionThread', () => {
  beforeEach(async () => {
    await prisma.post.deleteMany()
    await prisma.threadMembership.deleteMany()
    await prisma.section.deleteMany()
    await prisma.book.deleteMany()
    await prisma.user.deleteMany()
  })

  it('returns locked with no posts field when the viewer has not joined', async () => {
    const book = await prisma.book.create({
      data: { title: 'Dune', author: 'Herbert', sections: { create: [{ label: 'Ch 1-5', order: 1 }] } },
      include: { sections: true },
    })
    const author = await prisma.user.create({ data: { googleId: 'g-7', email: 'author2@example.com' } })
    const viewer = await prisma.user.create({ data: { googleId: 'g-8', email: 'viewer4@example.com' } })
    await prisma.post.create({ data: { sectionId: book.sections[0].id, userId: author.id, body: 'Spoiler!' } })

    const result = await getSectionThread(book.sections[0].id, viewer.id)

    expect(result).toEqual({ status: 'locked', label: 'Ch 1-5' })
    expect(result).not.toHaveProperty('posts')
  })

  it('returns the posts once the viewer has joined', async () => {
    const book = await prisma.book.create({
      data: { title: 'Dune', author: 'Herbert', sections: { create: [{ label: 'Ch 1-5', order: 1 }] } },
      include: { sections: true },
    })
    const viewer = await prisma.user.create({ data: { googleId: 'g-9', email: 'viewer5@example.com' } })
    await joinSection(viewer.id, book.sections[0].id)
    await prisma.post.create({ data: { sectionId: book.sections[0].id, userId: viewer.id, body: 'Hi all' } })

    const result = await getSectionThread(book.sections[0].id, viewer.id)

    expect(result.status).toBe('unlocked')
    if (result.status === 'unlocked') {
      expect(result.posts).toHaveLength(1)
      expect(result.posts[0].body).toBe('Hi all')
    }
  })
})
