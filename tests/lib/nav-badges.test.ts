import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { submitRequest } from '@/lib/roadmap'
import { getNavBadges } from '@/lib/nav-badges'

describe('getNavBadges', () => {
  beforeEach(async () => {
    await prisma.roadmapEntry.deleteMany()
    await prisma.roadmapVote.deleteMany()
    await prisma.roadmapItem.deleteMany()
    await prisma.user.deleteMany({ where: { googleId: { in: ['g-nm', 'g-nad'] } } })
  })

  it('shows What\'s new for a new member, and never the admin dot, even with a pending request', async () => {
    const member = await prisma.user.create({ data: { googleId: 'g-nm', email: 'nm@example.com' } })
    await submitRequest(member.id, 'Idea', 'Details')
    expect(await getNavBadges({ id: member.id, isAdmin: false })).toEqual({ whatsNew: true, admin: false })
  })

  it('shows the admin dot only while a request is pending', async () => {
    const admin = await prisma.user.create({ data: { googleId: 'g-nad', email: 'nad@example.com' } })
    expect((await getNavBadges({ id: admin.id, isAdmin: true })).admin).toBe(false)
    await submitRequest(admin.id, 'Idea', 'Details')
    expect((await getNavBadges({ id: admin.id, isAdmin: true })).admin).toBe(true)
  })
})
