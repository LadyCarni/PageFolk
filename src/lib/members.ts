import { prisma } from '@/lib/db'

// Only id and name are selected: emails and progress never leave the database from here.
export async function listMembers(): Promise<{ id: string; name: string | null }[]> {
  const users = await prisma.user.findMany({ select: { id: true, name: true } })
  return users.sort((a, b) => {
    if (a.name === null || b.name === null) {
      if (a.name === b.name) return a.id.localeCompare(b.id)
      return a.name === null ? 1 : -1
    }
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) || a.id.localeCompare(b.id)
  })
}
