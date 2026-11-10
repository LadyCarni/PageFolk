import { prisma } from '@/lib/db'
import { isNewerThan, latestVersion } from '@/lib/changelog'

// A session can outlive its user row, so a missing user means nothing to show rather than an error.
export async function hasUnseenVersion(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { lastSeenVersion: true } })
  return user !== null && isNewerThan(latestVersion(), user.lastSeenVersion)
}

// Records that the member has seen the latest version. Returns what they had seen before, for the New tags.
export async function markVersionSeen(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { lastSeenVersion: true } })
  if (!user) return null
  await prisma.user.updateMany({ where: { id: userId }, data: { lastSeenVersion: latestVersion() } })
  return user.lastSeenVersion
}
