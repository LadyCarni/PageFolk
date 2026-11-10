import { prisma } from '@/lib/db'
import { isNewerThan, latestVersion } from '@/lib/changelog'

export async function hasUnseenVersion(userId: string): Promise<boolean> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { lastSeenVersion: true } })
  return isNewerThan(latestVersion(), user.lastSeenVersion)
}

// Records that the member has seen the latest version. Returns what they had seen before, for the New tags.
export async function markVersionSeen(userId: string): Promise<string | null> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { lastSeenVersion: true } })
  await prisma.user.update({ where: { id: userId }, data: { lastSeenVersion: latestVersion() } })
  return user.lastSeenVersion
}
