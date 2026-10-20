import { prisma } from '@/lib/db'
import { addAllowedEmail, isEmailAllowed } from '@/lib/allowlist'

export type AccessRequest = {
  email: string
  name: string | null
  avatarUrl: string | null
  requestedAt: Date
}

// The sign-in gate: allowed emails get in; anyone else is turned away and
// left in the admin's "Waiting for approval" list.
export async function allowOrRequestAccess(user: {
  email?: string | null
  name?: string | null
  image?: string | null
}): Promise<boolean> {
  if (!user.email) return false
  if (await isEmailAllowed(user.email)) return true
  const email = user.email.toLowerCase()
  const details = { name: user.name ?? null, avatarUrl: user.image ?? null, requestedAt: new Date() }
  await prisma.accessRequest.upsert({ where: { email }, update: details, create: { email, ...details } })
  return false
}

export async function listAccessRequests(): Promise<AccessRequest[]> {
  return prisma.accessRequest.findMany({ orderBy: { requestedAt: 'desc' } })
}

export async function approveAccessRequest(email: string): Promise<void> {
  await addAllowedEmail(email)
  await dismissAccessRequest(email)
}

export async function dismissAccessRequest(email: string): Promise<void> {
  await prisma.accessRequest.deleteMany({ where: { email: email.toLowerCase() } })
}
