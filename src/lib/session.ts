import { auth } from '@/auth'

export async function requireUser() {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Not signed in')
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
