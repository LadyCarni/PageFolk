import { prisma } from '@/lib/db'

export async function listBooks(status?: 'current' | 'past') {
  return prisma.book.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    include: {
      sections: {
        orderBy: { order: 'asc' },
        include: { _count: { select: { posts: true } } },
      },
    },
  })
}

export async function createBook(input: { title: string; author: string; coverUrl?: string }) {
  return prisma.book.create({ data: { ...input, status: 'current' } })
}

export async function addSection(bookId: string, label: string) {
  const { _max } = await prisma.section.aggregate({
    where: { bookId },
    _max: { order: true },
  })
  const order = (_max.order ?? 0) + 1
  return prisma.section.create({ data: { bookId, label, order } })
}

export async function setBookStatus(bookId: string, status: 'current' | 'past') {
  return prisma.book.update({ where: { id: bookId }, data: { status } })
}

export async function updateSectionLabel(sectionId: string, label: string) {
  return prisma.section.update({ where: { id: sectionId }, data: { label } })
}

export async function deleteSection(sectionId: string): Promise<void> {
  await prisma.$transaction([
    prisma.post.deleteMany({ where: { sectionId } }),
    prisma.threadMembership.deleteMany({ where: { sectionId } }),
    prisma.section.delete({ where: { id: sectionId } }),
  ])
}

export async function deleteBook(bookId: string): Promise<void> {
  const sectionIds = (await prisma.section.findMany({ where: { bookId }, select: { id: true } })).map((s) => s.id)
  await prisma.$transaction([
    prisma.post.deleteMany({ where: { sectionId: { in: sectionIds } } }),
    prisma.threadMembership.deleteMany({ where: { sectionId: { in: sectionIds } } }),
    prisma.section.deleteMany({ where: { bookId } }),
    prisma.book.delete({ where: { id: bookId } }),
  ])
}
