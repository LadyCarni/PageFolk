import { prisma } from '@/lib/db'

export type SectionSummary =
  | { id: string; label: string; order: number; status: 'locked' }
  | { id: string; label: string; order: number; status: 'unlocked'; postCount: number }

export type PostWithAuthor = {
  id: string
  body: string
  parentPostId: string | null
  createdAt: Date
  user: { id: string; name: string | null; avatarUrl: string | null }
}

export type ThreadResult =
  | { status: 'locked'; label: string }
  | { status: 'unlocked'; label: string; posts: PostWithAuthor[] }

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

export async function getSectionThread(sectionId: string, userId: string): Promise<ThreadResult> {
  const section = await prisma.section.findUniqueOrThrow({ where: { id: sectionId } })
  const membership = await prisma.threadMembership.findUnique({
    where: { userId_sectionId: { userId, sectionId } },
  })

  if (!membership) {
    return { status: 'locked', label: section.label }
  }

  const posts = await prisma.post.findMany({
    where: { sectionId },
    orderBy: { createdAt: 'asc' },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  })

  return { status: 'unlocked', label: section.label, posts }
}
