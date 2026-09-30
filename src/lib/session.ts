import { auth } from '@/auth'
import { isEmailAllowed } from '@/lib/allowlist'

export async function requireUser() {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Not signed in')
  }
  if (!(await isEmailAllowed(session.user.email!))) {
    throw new Error('Access revoked')
  }
  return session.user
}

export async function requireAdmin() {
  const user = await requireUser()
  if (!user.isAdmin) {
    throw new Error('Forbidden: admin only')
  }
  return user
}
