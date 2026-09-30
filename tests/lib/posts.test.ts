import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { joinSection } from '@/lib/sections'
import { createPost } from '@/lib/posts'

describe('createPost', () => {
  beforeEach(async () => {
    await prisma.post.deleteMany()
    await prisma.threadMembership.deleteMany()
    await prisma.section.deleteMany()
    await prisma.book.deleteMany()
    await prisma.user.deleteMany()
  })

  async function setup() {
    const book = await prisma.book.create({
      data: { title: 'Dune', author: 'Herbert', sections: { create: [{ label: 'Ch 1-5', order: 1 }] } },
      include: { sections: true },
    })
    const user = await prisma.user.create({ data: { googleId: 'g-10', email: 'poster@example.com' } })
    return { sectionId: book.sections[0].id, userId: user.id }
  }

  it('creates a post for a member of the section', async () => {
    const { sectionId, userId } = await setup()
    await joinSection(userId, sectionId)

    const post = await createPost(sectionId, userId, 'Great chapter!')

    expect(post.body).toBe('Great chapter!')
  })

  it('rejects an empty body', async () => {
    const { sectionId, userId } = await setup()
    await joinSection(userId, sectionId)

    await expect(createPost(sectionId, userId, '   ')).rejects.toThrow('empty')
  })

  it('rejects posting from someone who has not joined the section', async () => {
    const { sectionId, userId } = await setup()

    await expect(createPost(sectionId, userId, 'Sneaky post')).rejects.toThrow('join')
  })

  it('supports a parentPostId for threaded replies', async () => {
    const { sectionId, userId } = await setup()
    await joinSection(userId, sectionId)
    const parent = await createPost(sectionId, userId, 'Original thought')

    const reply = await createPost(sectionId, userId, 'Agreed!', parent.id)

    expect(reply.parentPostId).toBe(parent.id)
  })
})
