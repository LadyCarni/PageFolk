import { prisma } from '@/lib/db'
import { sectionDisplayName } from '@/lib/chapters'
import { getChapterNames } from '@/lib/chapter-names'
import { getProgress } from '@/lib/progress'

// A sealed thread exposes only its chapter range, how far away it is, and the name of the
// chapter it opens after (table-of-contents information, not a spoiler). Its title and
// posts must never reach the page: this shape is the server-side guarantee of that.
export type SectionSummary =
  | {
      id: string
      order: number
      status: 'locked'
      startChapter: number
      endChapter: number
      chaptersToGo: number
      endChapterName: string | null
    }
  | {
      id: string
      order: number
      status: 'unlocked'
      startChapter: number
      endChapter: number
      title: string | null
      postCount: number
      lastPostAt: Date | null
    }

export type PostWithAuthor = {
  id: string
  body: string
  parentPostId: string | null
  createdAt: Date
  user: { id: string; name: string | null; avatarUrl: string | null }
}

export type ThreadResult =
  | { status: 'locked' }
  | {
      status: 'unlocked'
      name: string
      title: string | null
      startChapter: number
      endChapter: number
      endChapterName: string | null
      posts: PostWithAuthor[]
    }

export async function getSectionsForViewer(bookId: string, userId: string): Promise<SectionSummary[]> {
  const [finished, chapterNames] = await Promise.all([getProgress(userId, bookId), getChapterNames(bookId)])
  const sections = await prisma.section.findMany({
    where: { bookId },
    orderBy: { order: 'asc' },
    include: {
      memberships: { where: { userId } },
      _count: { select: { posts: true } },
      posts: { select: { createdAt: true }, orderBy: { createdAt: 'desc' }, take: 1 },
    },
  })

  return sections.map((section): SectionSummary => {
    const unlocked = section.memberships.length > 0
    if (!unlocked) {
      return {
        id: section.id,
        order: section.order,
        status: 'locked',
        startChapter: section.startChapter,
        endChapter: section.endChapter,
        chaptersToGo: Math.max(0, section.endChapter - finished),
        endChapterName: chapterNames[section.endChapter] ?? null,
      }
    }
    return {
      id: section.id,
      order: section.order,
      status: 'unlocked',
      startChapter: section.startChapter,
      endChapter: section.endChapter,
      title: section.title,
      postCount: section._count.posts,
      lastPostAt: section.posts[0]?.createdAt ?? null,
    }
  })
}

export async function getSectionThread(sectionId: string, userId: string): Promise<ThreadResult> {
  const section = await prisma.section.findUniqueOrThrow({ where: { id: sectionId } })
  const membership = await prisma.threadMembership.findUnique({
    where: { userId_sectionId: { userId, sectionId } },
  })

  if (!membership) {
    return { status: 'locked' }
  }

  const [posts, endChapterName] = await Promise.all([
    prisma.post.findMany({
      where: { sectionId },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    }),
    prisma.chapterName.findUnique({
      where: { bookId_number: { bookId: section.bookId, number: section.endChapter } },
    }),
  ])

  return {
    status: 'unlocked',
    name: sectionDisplayName(section),
    title: section.title,
    startChapter: section.startChapter,
    endChapter: section.endChapter,
    endChapterName: endChapterName?.name ?? null,
    posts,
  }
}

export async function getSectionBook(sectionId: string): Promise<{ bookId: string; status: string } | null> {
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    select: { bookId: true, book: { select: { status: true } } },
  })
  return section ? { bookId: section.bookId, status: section.book.status } : null
}
