import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { createPost, deletePost } from '@/lib/posts'

async function unlock(userId: string, sectionId: string) {
  await prisma.threadMembership.upsert({
    where: { userId_sectionId: { userId, sectionId } },
    update: {},
    create: { userId, sectionId },
  })
}

describe('createPost', () => {
  beforeEach(async () => {
    await prisma.readingProgress.deleteMany()
    await prisma.post.deleteMany()
    await prisma.threadMembership.deleteMany()
    await prisma.section.deleteMany()
    await prisma.book.deleteMany()
    await prisma.user.deleteMany()
  })

  async function setup() {
    const book = await prisma.book.create({
      data: { title: 'Dune', author: 'Herbert', totalChapters: 30, sections: { create: [{ startChapter: 1, endChapter: 5, order: 1 }] } },
      include: { sections: true },
    })
    const user = await prisma.user.create({ data: { googleId: 'g-10', email: 'poster@example.com' } })
    return { sectionId: book.sections[0].id, userId: user.id }
  }

  it('creates a post for a member of the section', async () => {
    const { sectionId, userId } = await setup()
    await unlock(userId, sectionId)

    const post = await createPost(sectionId, userId, 'Great chapter!')

    expect(post.body).toBe('Great chapter!')
  })

  it('rejects an empty body', async () => {
    const { sectionId, userId } = await setup()
    await unlock(userId, sectionId)

    await expect(createPost(sectionId, userId, '   ')).rejects.toThrow('empty')
  })

  it('rejects posting from someone who has not joined the section', async () => {
    const { sectionId, userId } = await setup()

    await expect(createPost(sectionId, userId, 'Sneaky post')).rejects.toThrow('join')
  })

  it('supports a parentPostId for threaded replies', async () => {
    const { sectionId, userId } = await setup()
    await unlock(userId, sectionId)
    const parent = await createPost(sectionId, userId, 'Original thought')

    const reply = await createPost(sectionId, userId, 'Agreed!', parent.id)

    expect(reply.parentPostId).toBe(parent.id)
  })
})

describe('deletePost', () => {
  beforeEach(async () => {
    await prisma.readingProgress.deleteMany()
    await prisma.post.deleteMany()
    await prisma.threadMembership.deleteMany()
    await prisma.section.deleteMany()
    await prisma.book.deleteMany()
    await prisma.user.deleteMany()
  })

  async function setup() {
    const book = await prisma.book.create({
      data: { title: 'Dune', author: 'Herbert', totalChapters: 30, sections: { create: [{ startChapter: 1, endChapter: 5, order: 1 }] } },
      include: { sections: true },
    })
    const author = await prisma.user.create({ data: { googleId: 'g-20', email: 'author@example.com' } })
    const other = await prisma.user.create({ data: { googleId: 'g-21', email: 'other@example.com' } })
    const sectionId = book.sections[0].id
    await unlock(author.id, sectionId)
    await unlock(other.id, sectionId)
    return { sectionId, authorId: author.id, otherId: other.id }
  }

  it('deletes the author\'s own post', async () => {
    const { sectionId, authorId } = await setup()
    const post = await createPost(sectionId, authorId, 'Oops')

    await deletePost(post.id, authorId)

    expect(await prisma.post.count()).toBe(0)
  })

  it('deletes the whole thread of replies, including other users\' replies', async () => {
    const { sectionId, authorId, otherId } = await setup()
    const top = await createPost(sectionId, authorId, 'Top')
    const reply = await createPost(sectionId, otherId, 'Reply', top.id)
    await createPost(sectionId, authorId, 'Nested', reply.id)
    const unrelated = await createPost(sectionId, otherId, 'Unrelated')

    await deletePost(top.id, authorId)

    const remaining = await prisma.post.findMany()
    expect(remaining.map((p) => p.id)).toEqual([unrelated.id])
  })

  it('deletes only a reply, leaving its parent', async () => {
    const { sectionId, authorId, otherId } = await setup()
    const top = await createPost(sectionId, otherId, 'Top')
    const reply = await createPost(sectionId, authorId, 'Reply', top.id)

    await deletePost(reply.id, authorId)

    const remaining = await prisma.post.findMany()
    expect(remaining.map((p) => p.id)).toEqual([top.id])
  })

  it('rejects deleting someone else\'s post', async () => {
    const { sectionId, authorId, otherId } = await setup()
    const post = await createPost(sectionId, authorId, 'Mine')

    await expect(deletePost(post.id, otherId)).rejects.toThrow('your own')
    expect(await prisma.post.count()).toBe(1)
  })
})
