import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { hasUnseenVersion, markVersionSeen } from '@/lib/whats-new'

describe('whats-new', () => {
  beforeEach(async () => {
    await prisma.postReaction.deleteMany()
    await prisma.readingProgress.deleteMany()
    await prisma.post.deleteMany()
    await prisma.threadMembership.deleteMany()
    await prisma.user.deleteMany()
  })

  it('flags a new user as having something unseen, until they have seen it', async () => {
    const user = await prisma.user.create({ data: { googleId: 'g-a', email: 'a@example.com' } })
    expect(await hasUnseenVersion(user.id)).toBe(true)
    expect(await markVersionSeen(user.id)).toBeNull()
    expect(await hasUnseenVersion(user.id)).toBe(false)
  })

  it('returns the previous version when marking seen again', async () => {
    const user = await prisma.user.create({ data: { googleId: 'g-a', email: 'a@example.com', lastSeenVersion: '1.0' } })
    expect(await markVersionSeen(user.id)).toBe('1.0')
  })

  it('does not error for a user whose last seen version is newer than any entry', async () => {
    const user = await prisma.user.create({ data: { googleId: 'g-a', email: 'a@example.com', lastSeenVersion: '99.0' } })
    expect(await hasUnseenVersion(user.id)).toBe(false)
  })
})
