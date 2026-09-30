import { prisma } from '@/lib/db'

export type SectionSummary =
  | { id: string; label: string; order: number; status: 'locked' }
  | { id: string; label: string; order: number; status: 'unlocked'; postCount: number }

export async function getSectionsForViewer(bookId: string, userId: string): Promise<SectionSummary[]> {
  const sections = await prisma.section.findMany({
    where: { bookId },
    orderBy: { order: 'asc' },
    include: {
      memberships: { where: { userId } },
      _count: { select: { posts: true } },
    },
  })

  return sections.map((section) => {
    const joined = section.memberships.length > 0
    if (!joined) {
      return { id: section.id, label: section.label, order: section.order, status: 'locked' as const }
    }
    return {
      id: section.id,
      label: section.label,
      order: section.order,
      status: 'unlocked' as const,
      postCount: section._count.posts,
    }
  })
}

export async function joinSection(userId: string, sectionId: string): Promise<void> {
  await prisma.threadMembership.upsert({
    where: { userId_sectionId: { userId, sectionId } },
    update: {},
    create: { userId, sectionId },
  })
}
