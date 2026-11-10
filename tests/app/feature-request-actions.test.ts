import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { submitRequest } from '@/lib/roadmap'

const mockRequireUser = vi.fn()
const mockRequireAdmin = vi.fn()
vi.mock('@/lib/session', () => ({
  requireUser: () => mockRequireUser(),
  requireAdmin: () => mockRequireAdmin(),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import {
  replyToItemAction, approveRequestAction, declineRequestAction,
  createRoadmapItemAction, setItemStatusAction, updateItemAction,
} from '@/app/admin/feature-requests/actions'
import { revalidatePath } from 'next/cache'

function fd(fields: Record<string, string>) {
  const f = new FormData()
  for (const [k, v] of Object.entries(fields)) f.set(k, v)
  return f
}

describe('feature request admin actions', () => {
  let adminId: string
  let memberId: string
  beforeEach(async () => {
    vi.mocked(revalidatePath).mockClear()
    await prisma.roadmapEntry.deleteMany()
    await prisma.roadmapVote.deleteMany()
    await prisma.roadmapItem.deleteMany()
    await prisma.user.deleteMany({ where: { googleId: { in: ['g-fr-ad', 'g-fr-m'] } } })
    adminId = (await prisma.user.create({ data: { googleId: 'g-fr-ad', email: 'fr-ad@example.com' } })).id
    memberId = (await prisma.user.create({ data: { googleId: 'g-fr-m', email: 'fr-m@example.com' } })).id
    mockRequireAdmin.mockReset()
    mockRequireAdmin.mockResolvedValue({ id: adminId, isAdmin: true })
  })

  it('every admin action rejects with Forbidden for a non-admin', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Forbidden: admin only'))
    await expect(replyToItemAction('i', fd({ body: 'x' }))).rejects.toThrow('Forbidden')
    await expect(approveRequestAction('i', fd({ title: 'x', description: '' }))).rejects.toThrow('Forbidden')
    await expect(declineRequestAction('i', fd({ note: 'x' }))).rejects.toThrow('Forbidden')
    await expect(createRoadmapItemAction(fd({ title: 'x', description: '' }))).rejects.toThrow('Forbidden')
    await expect(setItemStatusAction('i', 'planned')).rejects.toThrow('Forbidden')
    await expect(updateItemAction('i', fd({ title: 'x', description: '' }))).rejects.toThrow('Forbidden')
  })

  it('approve returns {} and the item is planned', async () => {
    const item = await submitRequest(memberId, 'Idea', 'desc')
    expect(await approveRequestAction(item.id, fd({ title: 'Idea', description: 'desc' }))).toEqual({})
    expect((await prisma.roadmapItem.findUniqueOrThrow({ where: { id: item.id } })).status).toBe('planned')
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout')
    expect(revalidatePath).toHaveBeenCalledWith('/whats-new')
    expect(revalidatePath).toHaveBeenCalledWith('/admin/feature-requests')
  })

  it('decline marks not_planned and revalidates layout', async () => {
    const item = await submitRequest(memberId, 'Idea', 'desc')
    expect(await declineRequestAction(item.id, fd({ note: 'not now' }))).toEqual({})
    expect((await prisma.roadmapItem.findUniqueOrThrow({ where: { id: item.id } })).status).toBe('not_planned')
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout')
  })

  it('create reports validation errors', async () => {
    expect(await createRoadmapItemAction(fd({ title: '', description: '' }))).toHaveProperty('error')
    expect(await createRoadmapItemAction(fd({ title: 'New', description: 'details' }))).toEqual({})
  })

  it('setItemStatusAction rejects an unknown status', async () => {
    const item = await submitRequest(memberId, 'Idea', 'desc')
    await approveRequestAction(item.id, fd({ title: 'Idea', description: 'desc' }))
    await expect(setItemStatusAction(item.id, 'shipped')).rejects.toThrow()
    await setItemStatusAction(item.id, 'in_progress')
    expect((await prisma.roadmapItem.findUniqueOrThrow({ where: { id: item.id } })).status).toBe('in_progress')
  })

  it('update and reply work', async () => {
    const item = await submitRequest(memberId, 'Idea', 'desc')
    await approveRequestAction(item.id, fd({ title: 'Idea', description: 'desc' }))
    expect(await updateItemAction(item.id, fd({ title: 'Renamed', description: 'd' }))).toEqual({})
    expect((await prisma.roadmapItem.findUniqueOrThrow({ where: { id: item.id } })).title).toBe('Renamed')
    await replyToItemAction(item.id, fd({ body: 'thanks' }))
    expect(revalidatePath).toHaveBeenCalledWith('/whats-new')
  })
})
