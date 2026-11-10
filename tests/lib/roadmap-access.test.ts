import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { ValidationError } from '@/lib/errors'
import { FEATURE_REPLY_MAX } from '@/lib/limits'
import {
  submitRequest,
  approveRequest,
  createAdminItem,
  setItemStatus,
  canViewItem,
  toggleVote,
  addAdminReply,
} from '@/lib/roadmap'

describe('roadmap access, votes and replies', () => {
  beforeEach(async () => {
    await prisma.roadmapEntry.deleteMany()
    await prisma.roadmapVote.deleteMany()
    await prisma.roadmapItem.deleteMany()
    await prisma.user.deleteMany({ where: { googleId: { in: ['g-m', 'g-o', 'g-ad'] } } })
  })

  async function setup() {
    const member = await prisma.user.create({ data: { googleId: 'g-m', email: 'm@example.com' } })
    const other = await prisma.user.create({ data: { googleId: 'g-o', email: 'o@example.com' } })
    const admin = await prisma.user.create({ data: { googleId: 'g-ad', email: 'ad@example.com' } })
    return { member: member.id, other: other.id, admin: admin.id }
  }

  it('canViewItem truth table', () => {
    const review = { status: 'review', authorId: 'a', number: null }
    expect(canViewItem(review, { id: 'b', isAdmin: false }, false)).toBe(false)
    expect(canViewItem(review, { id: 'a', isAdmin: false }, false)).toBe(true)
    expect(canViewItem(review, { id: 'b', isAdmin: true }, false)).toBe(true)
    expect(canViewItem({ status: 'planned', authorId: 'a', number: 1 }, { id: 'b', isAdmin: false }, false)).toBe(true)
    expect(canViewItem({ status: 'in_progress', authorId: 'a', number: 1 }, { id: 'b', isAdmin: false }, false)).toBe(true)
    const np = { status: 'not_planned', authorId: 'a', number: null }
    expect(canViewItem(np, { id: 'b', isAdmin: false }, false)).toBe(false)
    expect(canViewItem(np, { id: 'b', isAdmin: false }, true)).toBe(true)
  })

  it('voting toggles on then off', async () => {
    const { member, admin } = await setup()
    const item = await createAdminItem(admin, 'T', 'D')
    expect(await toggleVote(item.id, member)).toBe(true)
    expect(await prisma.roadmapVote.count()).toBe(1)
    expect(await toggleVote(item.id, member)).toBe(false)
    expect(await prisma.roadmapVote.count()).toBe(0)
  })

  it('concurrent toggles do not throw and leave at most one vote', async () => {
    const { member, admin } = await setup()
    const item = await createAdminItem(admin, 'T', 'D')
    await expect(Promise.all([toggleVote(item.id, member), toggleVote(item.id, member)])).resolves.toBeDefined()
    expect(await prisma.roadmapVote.count()).toBeLessThanOrEqual(1)
  })

  it('voting on a review item rejects', async () => {
    const { member } = await setup()
    const item = await submitRequest(member, 'A', 'a')
    await expect(toggleVote(item.id, member)).rejects.toThrow('You can only vote on roadmap items')
    expect(await prisma.roadmapVote.count()).toBe(0)
  })

  it('a member can vote on their own approved request', async () => {
    const { member, admin } = await setup()
    const item = await submitRequest(member, 'A', 'a')
    await approveRequest(item.id, admin, 'A', 'a')
    expect(await toggleVote(item.id, member)).toBe(true)
  })

  it('a blank or too-long reply rejects and creates no entry', async () => {
    const { admin } = await setup()
    const item = await createAdminItem(admin, 'T', 'D')
    await expect(addAdminReply(item.id, admin, '   ')).rejects.toBeInstanceOf(ValidationError)
    await expect(addAdminReply(item.id, admin, 'x'.repeat(FEATURE_REPLY_MAX + 1))).rejects.toBeInstanceOf(ValidationError)
    expect(await prisma.roadmapEntry.count()).toBe(0)
  })

  it('a reply on a not_planned item succeeds and is trimmed', async () => {
    const { admin } = await setup()
    const item = await createAdminItem(admin, 'T', 'D')
    await setItemStatus(item.id, admin, 'not_planned')
    await addAdminReply(item.id, admin, '  Sorry  ')
    const replies = await prisma.roadmapEntry.findMany({ where: { itemId: item.id, kind: 'reply' } })
    expect(replies.map((r) => r.body)).toEqual(['Sorry'])
  })
})
