import { hasUnseenVersion } from '@/lib/whats-new'
import { pendingRequestCount } from '@/lib/roadmap'

export type NavBadges = { whatsNew: boolean; admin: boolean }

// Only admins ever see the Admin dot, so members never pay for the pending-request count.
export async function getNavBadges(user: { id: string; isAdmin: boolean }): Promise<NavBadges> {
  const [whatsNew, pending] = await Promise.all([
    hasUnseenVersion(user.id),
    user.isAdmin ? pendingRequestCount() : Promise.resolve(0),
  ])
  return { whatsNew, admin: user.isAdmin && pending > 0 }
}
