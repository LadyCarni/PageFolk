import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { deletePost } from '@/lib/posts'
import { getSectionThread } from '@/lib/sections'
import { summarizeReactions, toggleReaction } from '@/lib/reactions'

describe('reactions', () => {
  beforeEach(async () => {
    await prisma.postReaction.deleteMany()
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
    const sectionId = book.sections[0].id
    const alice = await prisma.user.create({ data: { googleId: 'g-a', email: 'a@example.com' } })
    const bob = await prisma.user.create({ data: { googleId: 'g-b', email: 'b@example.com' } })
    await prisma.threadMembership.createMany({ data: [{ userId: alice.id, sectionId }, { userId: bob.id, sectionId }] })
    const post = await prisma.post.create({ data: { sectionId, userId: alice.id, body: 'Spice!' } })
    return { sectionId, alice: alice.id, bob: bob.id, postId: post.id }
  }

  it('adds a reaction, and a second toggle undoes it', async () => {
    const { postId, bob } = await setup()

    expect(await toggleReaction(postId, bob, 'heart')).toBe(true)
    expect(await prisma.postReaction.count()).toBe(1)

    expect(await toggleReaction(postId, bob, 'heart')).toBe(false)
    expect(await prisma.postReaction.count()).toBe(0)
  })

  it('counts each kind once per person, but lets one person use several kinds', async () => {
    const { postId, alice, bob } = await setup()
    await toggleReaction(postId, alice, 'heart') // reacting to your own post is allowed
    await toggleReaction(postId, bob, 'heart')
    await toggleReaction(postId, bob, 'laugh')

    const rows = await prisma.postReaction.findMany()
    expect(summarizeReactions(rows, bob)).toEqual({
      laugh: { count: 1, mine: true },
      heart: { count: 2, mine: true },
      cry: { count: 0, mine: false },
    })
    expect(summarizeReactions(rows, alice).laugh.mine).toBe(false)
  })

  it('rejects an unknown kind', async () => {
    const { postId, bob } = await setup()
    await expect(toggleReaction(postId, bob, 'angry')).rejects.toThrow('reaction')
  })

  it('rejects someone who has not unlocked the thread', async () => {
    const { postId } = await setup()
    const carol = await prisma.user.create({ data: { googleId: 'g-c', email: 'c@example.com' } })
    await expect(toggleReaction(postId, carol.id, 'heart')).rejects.toThrow('join')
  })

  it('removes reactions when their post is deleted', async () => {
    const { postId, alice, bob } = await setup()
    await toggleReaction(postId, bob, 'cry')
    await deletePost(postId, alice)
    expect(await prisma.postReaction.count()).toBe(0)
  })

  it('returns anonymous counts with the thread', async () => {
    const { sectionId, postId, bob } = await setup()
    await toggleReaction(postId, bob, 'laugh')

    const thread = await getSectionThread(sectionId, bob)
    if (thread.status !== 'unlocked') throw new Error('expected unlocked')
    expect(thread.posts[0].reactions.laugh).toEqual({ count: 1, mine: true })
    expect(JSON.stringify(thread.posts[0].reactions)).not.toContain(bob)
  })
})
