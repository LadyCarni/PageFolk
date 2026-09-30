import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'

describe('prisma schema', () => {
  beforeEach(async () => {
    await prisma.post.deleteMany()
    await prisma.threadMembership.deleteMany()
    await prisma.section.deleteMany()
    await prisma.book.deleteMany()
    await prisma.user.deleteMany()
    await prisma.allowedEmail.deleteMany()
  })

  it('creates a book with a section, a user, a membership, and a post', async () => {
    const book = await prisma.book.create({
      data: {
        title: 'Dune',
        author: 'Frank Herbert',
        status: 'current',
        sections: { create: [{ label: 'Chapters 1-5', order: 1 }] },
      },
      include: { sections: true },
    })

    const user = await prisma.user.create({
      data: { googleId: 'g-1', email: 'reader@example.com', name: 'Reader' },
    })

    await prisma.threadMembership.create({
      data: { userId: user.id, sectionId: book.sections[0].id },
    })

    const post = await prisma.post.create({
      data: { sectionId: book.sections[0].id, userId: user.id, body: 'What a start!' },
    })

    const found = await prisma.post.findUniqueOrThrow({
      where: { id: post.id },
      include: { user: true, section: true },
    })

    expect(found.body).toBe('What a start!')
    expect(found.user.email).toBe('reader@example.com')
    expect(found.section.label).toBe('Chapters 1-5')
  })

  it('rejects a duplicate ThreadMembership for the same user and section', async () => {
    const book = await prisma.book.create({
      data: { title: 'Dune', author: 'Frank Herbert', sections: { create: [{ label: 'Chapters 1-5', order: 1 }] } },
      include: { sections: true },
    })
    const user = await prisma.user.create({ data: { googleId: 'g-2', email: 'dup@example.com' } })

    await prisma.threadMembership.create({ data: { userId: user.id, sectionId: book.sections[0].id } })

    await expect(
      prisma.threadMembership.create({ data: { userId: user.id, sectionId: book.sections[0].id } })
    ).rejects.toThrow()
  })
})
