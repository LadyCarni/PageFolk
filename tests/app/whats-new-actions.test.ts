import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'

const mockRequireUser = vi.fn()
const mockRequireAdmin = vi.fn()
vi.mock('@/lib/session', () => ({
  requireUser: () => mockRequireUser(),
  requireAdmin: () => mockRequireAdmin(),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
const mockCookieSet = vi.fn()
vi.mock('next/headers', () => ({ cookies: () => ({ set: mockCookieSet }) }))

import { latestVersion } from '@/lib/changelog'
import { markWhatsNewSeenAction, submitFeatureRequestAction, toggleVoteAction } from '@/app/whats-new/actions'
import { revalidatePath } from 'next/cache'
import { createAdminItem } from '@/lib/roadmap'

describe('whats-new member actions', () => {
  let userId: string
  beforeEach(async () => {
    vi.mocked(revalidatePath).mockClear()
    mockCookieSet.mockClear()
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

  it('marks seen and stores the previous version in a cookie when it changed', async () => {
    await prisma.user.update({ where: { id: userId }, data: { lastSeenVersion: '0.1' } })
    await markWhatsNewSeenAction()
    expect(mockCookieSet).toHaveBeenCalledWith('whats_new_prev', '0.1', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/whats-new',
      maxAge: 3600,
    })
    expect((await prisma.user.findUnique({ where: { id: userId } }))?.lastSeenVersion).toBe(latestVersion())
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('stores an empty value for a first visit', async () => {
    await markWhatsNewSeenAction()
    expect(mockCookieSet).toHaveBeenCalledWith('whats_new_prev', '', expect.any(Object))
  })

  it('does not set the cookie when already up to date', async () => {
    await prisma.user.update({ where: { id: userId }, data: { lastSeenVersion: latestVersion() } })
    await markWhatsNewSeenAction()
    expect(mockCookieSet).not.toHaveBeenCalled()
  })
})
