import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'

const mockRequireUser = vi.fn()
vi.mock('@/lib/session', () => ({ requireUser: () => mockRequireUser() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { setProgressAction } from '@/app/sections/actions'

describe('setProgressAction', () => {
  beforeEach(async () => {
    mockRequireUser.mockReset()
    await prisma.readingProgress.deleteMany()
    await prisma.post.deleteMany()
    await prisma.threadMembership.deleteMany()
    await prisma.section.deleteMany()
    await prisma.book.deleteMany()
    await prisma.user.deleteMany()
  })

  async function setup() {
    const book = await prisma.book.create({
      data: {
        title: 'Jane Eyre',
        author: 'Brontë',
        totalChapters: 38,
        sections: { create: [{ startChapter: 1, endChapter: 5, order: 1 }] },
      },
    })
    const user = await prisma.user.create({ data: { googleId: 'g-act', email: 'act@example.com' } })
    return { book, user }
  }

  it('saves nothing for a signed-out visitor', async () => {
    const { book } = await setup()
    mockRequireUser.mockRejectedValue(new Error('Not signed in'))

    await expect(setProgressAction(book.id, 10)).rejects.toThrow('Not signed in')
    expect(await prisma.readingProgress.count()).toBe(0)
  })

  it('saves the clamped number for the signed-in user, unlocks threads, and returns the saved number', async () => {
    const { book, user } = await setup()
    mockRequireUser.mockResolvedValue({ id: user.id })

    expect(await setProgressAction(book.id, 99)).toBe(38)

    expect((await prisma.readingProgress.findMany()).map((p) => p.chaptersFinished)).toEqual([38])
    expect(await prisma.threadMembership.count({ where: { userId: user.id } })).toBe(1)
  })
})
