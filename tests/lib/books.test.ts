import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { listBooks, createBook, addSection, setBookStatus, updateSectionLabel, deleteSection } from '@/lib/books'

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

  it('includes each section\'s post count', async () => {
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert' })
    const section = await addSection(book.id, 'Chapters 1-5', 1)
    const user = await prisma.user.create({ data: { googleId: 'g-books-1', email: 'books1@example.com' } })
    await prisma.post.create({ data: { sectionId: section.id, userId: user.id, body: 'Hi' } })
    await prisma.post.create({ data: { sectionId: section.id, userId: user.id, body: 'Hi again' } })

    const [found] = await listBooks('current')
    expect(found.sections[0]._count.posts).toBe(2)
  })

  it('updates a section label', async () => {
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert' })
    const section = await addSection(book.id, 'Chapters 1-5', 1)

    await updateSectionLabel(section.id, 'Chapters 1-6')

    const [found] = await listBooks('current')
    expect(found.sections[0].label).toBe('Chapters 1-6')
  })

  it('deletes an empty section', async () => {
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert' })
    const section = await addSection(book.id, 'Chapters 1-5', 1)

    await deleteSection(section.id)

    const [found] = await listBooks('current')
    expect(found.sections).toHaveLength(0)
  })

  it('deletes a section along with its posts and memberships', async () => {
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert' })
    const section = await addSection(book.id, 'Chapters 1-5', 1)
    const user = await prisma.user.create({ data: { googleId: 'g-books-2', email: 'books2@example.com' } })
    await prisma.threadMembership.create({ data: { userId: user.id, sectionId: section.id } })
    await prisma.post.create({ data: { sectionId: section.id, userId: user.id, body: 'Spoilers!' } })

    await deleteSection(section.id)

    expect(await prisma.section.findUnique({ where: { id: section.id } })).toBeNull()
    expect(await prisma.post.count({ where: { sectionId: section.id } })).toBe(0)
    expect(await prisma.threadMembership.count({ where: { sectionId: section.id } })).toBe(0)
  })
})
