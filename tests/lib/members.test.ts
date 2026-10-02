import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { listMembers } from '@/lib/members'

describe('listMembers', () => {
  beforeEach(async () => {
    await prisma.readingProgress.deleteMany()
    await prisma.post.deleteMany()
    await prisma.threadMembership.deleteMany()
    await prisma.user.deleteMany()
  })

  it('lists named members alphabetically (ignoring case), then unnamed ones', async () => {
    await prisma.user.create({ data: { googleId: 'g1', email: 'z@example.com', name: 'zed' } })
    await prisma.user.create({ data: { googleId: 'g2', email: 'n@example.com' } })
    await prisma.user.create({ data: { googleId: 'g3', email: 'a@example.com', name: 'Amy' } })
    await prisma.user.create({ data: { googleId: 'g4', email: 'b@example.com', name: 'bob' } })

    const members = await listMembers()

    expect(members.map((m) => m.name)).toEqual(['Amy', 'bob', 'zed', null])
  })

  it('returns only id and name: never an email or anything else', async () => {
    await prisma.user.create({ data: { googleId: 'g5', email: 'secret@example.com', name: 'Amy', avatarUrl: 'x' } })

    const [member] = await listMembers()

    expect(Object.keys(member).sort()).toEqual(['id', 'name'])
    expect(JSON.stringify(member)).not.toContain('secret@example.com')
  })

  it('returns an empty list when nobody has signed in', async () => {
    expect(await listMembers()).toEqual([])
  })
})
