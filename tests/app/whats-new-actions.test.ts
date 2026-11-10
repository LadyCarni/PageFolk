import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'

const mockRequireUser = vi.fn()
const mockRequireAdmin = vi.fn()
vi.mock('@/lib/session', () => ({
  requireUser: () => mockRequireUser(),
  requireAdmin: () => mockRequireAdmin(),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { submitFeatureRequestAction, toggleVoteAction } from '@/app/whats-new/actions'
import { revalidatePath } from 'next/cache'
import { createAdminItem } from '@/lib/roadmap'

describe('whats-new member actions', () => {
  let userId: string
  beforeEach(async () => {
    vi.mocked(revalidatePath).mockClear()
    await prisma.roadmapEntry.deleteMany()
    await prisma.roadmapVote.deleteMany()
    await prisma.roadmapItem.deleteMany()
    await prisma.user.deleteMany({ where: { googleId: 'g-wn-m' } })
    const u = await prisma.user.create({ data: { googleId: 'g-wn-m', email: 'wn-m@example.com' } })
    userId = u.id
    mockRequireUser.mockReset()
    mockRequireUser.mockResolvedValue({ id: userId, isAdmin: false })
  })

  it('rejects a blank title and saves nothing', async () => {
    const fd = new FormData()
    fd.set('title', '   ')
    fd.set('description', 'x')
    expect(await submitFeatureRequestAction(fd)).toEqual({ error: 'Give your idea a title' })
    expect(await prisma.roadmapItem.count()).toBe(0)
  })

  it('submits and revalidates the layout', async () => {
    const fd = new FormData()
    fd.set('title', 'Dark mode')
    fd.set('description', 'please')
    expect(await submitFeatureRequestAction(fd)).toEqual({})
    expect(await prisma.roadmapItem.count()).toBe(1)
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout')
    expect(revalidatePath).toHaveBeenCalledWith('/whats-new')
  })

  it('toggles a vote', async () => {
    const item = await createAdminItem(userId, 't', 'd')
    await toggleVoteAction(item.id)
    expect(await prisma.roadmapVote.count()).toBe(1)
    expect(revalidatePath).toHaveBeenCalledWith('/whats-new')
  })
})
