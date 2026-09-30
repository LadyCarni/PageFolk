import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { listBooks, createBook, addSection, setBookStatus, updateSectionLabel, deleteSection, deleteBook } from '@/lib/books'

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

  it('adds sections to a book in creation order', async () => {
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert' })
    await addSection(book.id, 'Chapters 1-5')
    await addSection(book.id, 'Chapters 6-10')

    const [found] = await listBooks('current')
    expect(found.sections.map((s) => s.label)).toEqual(['Chapters 1-5', 'Chapters 6-10'])
    expect(found.sections.map((s) => s.order)).toEqual([1, 2])
  })

  it('keeps assigning the next order after a section in the middle is deleted', async () => {
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert' })
    const first = await addSection(book.id, 'Chapters 1-5')
    await addSection(book.id, 'Chapters 6-10')
    await deleteSection(first.id)

    const third = await addSection(book.id, 'Chapters 11-15')

    expect(third.order).toBe(3)
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
    const section = await addSection(book.id, 'Chapters 1-5')
    const user = await prisma.user.create({ data: { googleId: 'g-books-1', email: 'books1@example.com' } })
    await prisma.post.create({ data: { sectionId: section.id, userId: user.id, body: 'Hi' } })
    await prisma.post.create({ data: { sectionId: section.id, userId: user.id, body: 'Hi again' } })

    const [found] = await listBooks('current')
    expect(found.sections[0]._count.posts).toBe(2)
  })

  it('updates a section label', async () => {
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert' })
    const section = await addSection(book.id, 'Chapters 1-5')

    await updateSectionLabel(section.id, 'Chapters 1-6')

    const [found] = await listBooks('current')
    expect(found.sections[0].label).toBe('Chapters 1-6')
  })

  it('deletes an empty section', async () => {
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert' })
    const section = await addSection(book.id, 'Chapters 1-5')

    await deleteSection(section.id)

    const [found] = await listBooks('current')
    expect(found.sections).toHaveLength(0)
  })

  it('deletes a section along with its posts and memberships', async () => {
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert' })
    const section = await addSection(book.id, 'Chapters 1-5')
    const user = await prisma.user.create({ data: { googleId: 'g-books-2', email: 'books2@example.com' } })
    await prisma.threadMembership.create({ data: { userId: user.id, sectionId: section.id } })
    await prisma.post.create({ data: { sectionId: section.id, userId: user.id, body: 'Spoilers!' } })

    await deleteSection(section.id)

    expect(await prisma.section.findUnique({ where: { id: section.id } })).toBeNull()
    expect(await prisma.post.count({ where: { sectionId: section.id } })).toBe(0)
    expect(await prisma.threadMembership.count({ where: { sectionId: section.id } })).toBe(0)
  })

  it('deletes a book along with its sections, posts and memberships, leaving other books alone', async () => {
    const doomed = await createBook({ title: 'Dune', author: 'Frank Herbert' })
    const kept = await createBook({ title: 'Emma', author: 'Jane Austen' })
    const doomedSection = await addSection(doomed.id, 'Chapters 1-5')
    const keptSection = await addSection(kept.id, 'Chapters 1-5')
    const user = await prisma.user.create({ data: { googleId: 'g-books-del', email: 'booksdel@example.com' } })
    await prisma.threadMembership.create({ data: { userId: user.id, sectionId: doomedSection.id } })
    const top = await prisma.post.create({ data: { sectionId: doomedSection.id, userId: user.id, body: 'Hi' } })
    await prisma.post.create({ data: { sectionId: doomedSection.id, userId: user.id, body: 'Re', parentPostId: top.id } })
    await prisma.post.create({ data: { sectionId: keptSection.id, userId: user.id, body: 'Keep me' } })

    await deleteBook(doomed.id)

    expect((await prisma.book.findMany()).map((b) => b.id)).toEqual([kept.id])
    expect((await prisma.section.findMany()).map((s) => s.id)).toEqual([keptSection.id])
    expect(await prisma.post.count()).toBe(1)
    expect(await prisma.threadMembership.count()).toBe(0)
  })

  it('deletes a book that has no sections', async () => {
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert' })
    await deleteBook(book.id)
    expect(await prisma.book.count()).toBe(0)
  })
})
