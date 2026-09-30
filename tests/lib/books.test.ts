import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { listBooks, createBook, addSection, setBookStatus } from '@/lib/books'

describe('books', () => {
  beforeEach(async () => {
    await prisma.post.deleteMany()
    await prisma.threadMembership.deleteMany()
    await prisma.section.deleteMany()
    await prisma.book.deleteMany()
  })

  it('creates a book as current by default', async () => {
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert' })
    expect(book.status).toBe('current')
  })

  it('adds sections to a book', async () => {
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert' })
    await addSection(book.id, 'Chapters 1-5', 1)
    await addSection(book.id, 'Chapters 6-10', 2)

    const [found] = await listBooks('current')
    expect(found.sections.map((s) => s.label)).toEqual(['Chapters 1-5', 'Chapters 6-10'])
  })

  it('filters by status', async () => {
    const current = await createBook({ title: 'Dune', author: 'Frank Herbert' })
    const past = await createBook({ title: 'Old Book', author: 'Someone' })
    await setBookStatus(past.id, 'past')

    expect((await listBooks('current')).map((b) => b.id)).toEqual([current.id])
    expect((await listBooks('past')).map((b) => b.id)).toEqual([past.id])
  })
})
