import { prisma } from '@/lib/db'

export async function isEmailAllowed(email: string): Promise<boolean> {
  const normalized = email.toLowerCase()
  if (normalized === process.env.ADMIN_EMAIL?.toLowerCase()) {
    return true
  }
  const entry = await prisma.allowedEmail.findUnique({ where: { email: normalized } })
  return entry !== null
}

export async function addAllowedEmail(email: string): Promise<void> {
  await prisma.allowedEmail.upsert({
    where: { email: email.toLowerCase() },
    update: {},
    create: { email: email.toLowerCase() },
  })
}

export async function removeAllowedEmail(email: string): Promise<void> {
  await prisma.allowedEmail.deleteMany({ where: { email: email.toLowerCase() } })
}

export async function listAllowedEmails(): Promise<string[]> {
  const rows = await prisma.allowedEmail.findMany({ orderBy: { addedAt: 'asc' } })
  return rows.map((r) => r.email)
}
