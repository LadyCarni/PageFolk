import { prisma } from '@/lib/db'
import { ValidationError } from '@/lib/errors'
import { validateClubName } from '@/lib/limits'

// There is only ever one club, stored as the row with id 1.
const CLUB_ID = 1

export async function getClubName(): Promise<string | null> {
  const club = await prisma.club.findUnique({ where: { id: CLUB_ID } })
  return club?.name ?? null
}

export async function setClubName(name: string): Promise<void> {
  const problem = validateClubName(name)
  if (problem) throw new ValidationError(problem)
  const trimmed = name.trim()
  await prisma.club.upsert({
    where: { id: CLUB_ID },
    update: { name: trimmed },
    create: { id: CLUB_ID, name: trimmed },
  })
}
