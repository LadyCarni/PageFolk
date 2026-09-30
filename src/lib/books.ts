import { prisma } from '@/lib/db'

export async function listBooks(status?: 'current' | 'past') {
  return prisma.book.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    include: { sections: { orderBy: { order: 'asc' } } },
  })
}

export async function createBook(input: { title: string; author: string; coverUrl?: string }) {
  return prisma.book.create({ data: { ...input, status: 'current' } })
}

export async function addSection(bookId: string, label: string, order: number) {
  return prisma.section.create({ data: { bookId, label, order } })
}

export async function setBookStatus(bookId: string, status: 'current' | 'past') {
  return prisma.book.update({ where: { id: bookId }, data: { status } })
}
