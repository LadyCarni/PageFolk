import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { ValidationError } from '@/lib/errors'
import {
  submitRequest,
  approveRequest,
  declineRequest,
  createAdminItem,
  setItemStatus,
  updateItem,
  pendingRequestCount,
} from '@/lib/roadmap'

describe('roadmap', () => {
  beforeEach(async () => {
    await prisma.roadmapEntry.deleteMany()
    await prisma.roadmapVote.deleteMany()
    await prisma.roadmapItem.deleteMany()
    await prisma.user.deleteMany()
  })

  async function setup() {
    const member = await prisma.user.create({ data: { googleId: 'g-m', email: 'm@example.com' } })
    const admin = await prisma.user.create({ data: { googleId: 'g-ad', email: 'ad@example.com' } })
    return { member: member.id, admin: admin.id }
  }

  it('submit creates a review item with trimmed originals and no number', async () => {
    const { member } = await setup()
    const item = await submitRequest(member, '  Dark mode  ', '  Please  ')
    expect(item.status).toBe('review')
    expect(item.isMemberRequest).toBe(true)
    expect(item.number).toBeNull()
    expect(item.originalTitle).toBe('Dark mode')
    expect(item.originalDescription).toBe('Please')
    expect(item.title).toBe('Dark mode')
  })

  it('approve with edited wording plans it, numbers it and adds an approved event', async () => {
    const { member, admin } = await setup()
    const item = await submitRequest(member, 'Dark mode', 'Please')
    const approved = await approveRequest(item.id, admin, 'Dark theme', 'A dark theme')
    expect(approved.status).toBe('planned')
    expect(approved.number).toBe(1)
    expect(approved.title).toBe('Dark theme')
    expect(approved.originalTitle).toBe('Dark mode')
    expect(approved.originalDescription).toBe('Please')
    const entries = await prisma.roadmapEntry.findMany({ where: { itemId: item.id } })
    expect(entries.map((e) => [e.kind, e.body])).toEqual([['event', 'approved']])
  })

  it('a second approval or admin item gets the next number', async () => {
    const { member, admin } = await setup()
    const a = await submitRequest(member, 'A', 'a')
    await approveRequest(a.id, admin, 'A', 'a')
    const b = await submitRequest(member, 'B', 'b')
    expect((await approveRequest(b.id, admin, 'B', 'b')).number).toBe(2)
    expect((await createAdminItem(admin, 'C', 'c')).number).toBe(3)
  })

  it('approving or declining a non-review item rejects and keeps the number', async () => {
    const { member, admin } = await setup()
    const a = await submitRequest(member, 'A', 'a')
    await approveRequest(a.id, admin, 'A', 'a')
    await expect(approveRequest(a.id, admin, 'A', 'a')).rejects.toBeInstanceOf(ValidationError)
    await expect(declineRequest(a.id, admin, '')).rejects.toBeInstanceOf(ValidationError)
    const b = await submitRequest(member, 'B', 'b')
    await declineRequest(b.id, admin, '')
    await expect(approveRequest(b.id, admin, 'B', 'b')).rejects.toBeInstanceOf(ValidationError)
    await expect(declineRequest(b.id, admin, '')).rejects.toBeInstanceOf(ValidationError)
    expect((await prisma.roadmapItem.findUniqueOrThrow({ where: { id: a.id } })).number).toBe(1)
    expect((await prisma.roadmapItem.findUniqueOrThrow({ where: { id: b.id } })).number).toBeNull()
  })

  it('decline adds the event then a trimmed reply', async () => {
    const { member, admin } = await setup()
    const a = await submitRequest(member, 'A', 'a')
    await declineRequest(a.id, admin, '  Not for now  ')
    const item = await prisma.roadmapItem.findUniqueOrThrow({ where: { id: a.id } })
    expect(item.status).toBe('not_planned')
    const entries = await prisma.roadmapEntry.findMany({ where: { itemId: a.id }, orderBy: { createdAt: 'asc' } })
    expect(entries.map((e) => [e.kind, e.body])).toEqual([['event', 'not_planned'], ['reply', 'Not for now']])
  })

  it('decline with a blank note adds no reply', async () => {
    const { member, admin } = await setup()
    const a = await submitRequest(member, 'A', 'a')
    await declineRequest(a.id, admin, '   ')
    const entries = await prisma.roadmapEntry.findMany({ where: { itemId: a.id } })
    expect(entries.map((e) => e.kind)).toEqual(['event'])
  })

  it('createAdminItem makes a numbered planned item', async () => {
    const { admin } = await setup()
    const item = await createAdminItem(admin, ' T ', ' D ')
    expect(item.isMemberRequest).toBe(false)
    expect(item.status).toBe('planned')
    expect(item.number).toBe(1)
    expect(item.originalTitle).toBe('T')
    expect(await prisma.roadmapEntry.count()).toBe(0)
  })

  it('setItemStatus adds an event on change and nothing when unchanged', async () => {
    const { admin } = await setup()
    const item = await createAdminItem(admin, 'T', 'D')
    await setItemStatus(item.id, admin, 'in_progress')
    await setItemStatus(item.id, admin, 'in_progress')
    const entries = await prisma.roadmapEntry.findMany({ where: { itemId: item.id } })
    expect(entries.map((e) => [e.kind, e.body])).toEqual([['event', 'in_progress']])
    expect((await prisma.roadmapItem.findUniqueOrThrow({ where: { id: item.id } })).status).toBe('in_progress')
  })

  it('setItemStatus on a review item rejects', async () => {
    const { member, admin } = await setup()
    const a = await submitRequest(member, 'A', 'a')
    await expect(setItemStatus(a.id, admin, 'planned')).rejects.toBeInstanceOf(ValidationError)
  })

  it('updateItem leaves the originals alone', async () => {
    const { admin } = await setup()
    const item = await createAdminItem(admin, 'T', 'D')
    await updateItem(item.id, ' New ', ' Newer ')
    const after = await prisma.roadmapItem.findUniqueOrThrow({ where: { id: item.id } })
    expect(after.title).toBe('New')
    expect(after.description).toBe('Newer')
    expect(after.originalTitle).toBe('T')
    expect(after.originalDescription).toBe('D')
  })

  it('rejects blank or too-long text without creating anything', async () => {
    const { member, admin } = await setup()
    await expect(submitRequest(member, '   ', 'd')).rejects.toBeInstanceOf(ValidationError)
    await expect(submitRequest(member, 't', '  ')).rejects.toBeInstanceOf(ValidationError)
    await expect(submitRequest(member, 'x'.repeat(101), 'd')).rejects.toBeInstanceOf(ValidationError)
    await expect(createAdminItem(admin, '', 'd')).rejects.toBeInstanceOf(ValidationError)
    expect(await prisma.roadmapItem.count()).toBe(0)
  })

  it('pendingRequestCount counts only review items', async () => {
    const { member, admin } = await setup()
    await submitRequest(member, 'A', 'a')
    const b = await submitRequest(member, 'B', 'b')
    await approveRequest(b.id, admin, 'B', 'b')
    await createAdminItem(admin, 'C', 'c')
    expect(await pendingRequestCount()).toBe(1)
  })
})
