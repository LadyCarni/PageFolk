import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import {
  listBooks,
  createBook,
  addSection,
  makeBookCurrent,
  markBookPast,
  updateSection,
  updateTotalChapters,
  deleteSection,
  deleteBook,
  setBlurb,
  setReadMonth,
  setGenre,
} from '@/lib/books'
import { setProgress } from '@/lib/progress'
import { setChapterNames } from '@/lib/chapter-names'
import { ValidationError } from '@/lib/errors'

async function newBook(totalChapters = 30) {
  return createBook({ title: 'Dune', author: 'Frank Herbert', totalChapters })
}

describe('books', () => {
  beforeEach(async () => {
    await prisma.chapterName.deleteMany()
    await prisma.readingProgress.deleteMany()
    await prisma.post.deleteMany()
    await prisma.threadMembership.deleteMany()
    await prisma.section.deleteMany()
    await prisma.book.deleteMany()
    await prisma.user.deleteMany()
  })

  it('creates a book as current by default, with its total chapters', async () => {
    const book = await newBook(38)
    expect(book.status).toBe('current')
    expect(book.totalChapters).toBe(38)
  })

  it('rejects a book whose total chapters is not a whole number of at least 1', async () => {
    await expect(newBook(0)).rejects.toThrow('Total chapters')
    await expect(newBook(NaN)).rejects.toThrow('Total chapters')
  })

  it('adds sections to a book in creation order', async () => {
    const book = await newBook()
    await addSection(book.id, { startChapter: 1, endChapter: 5 })
    await addSection(book.id, { startChapter: 6, endChapter: 10, title: 'Lowood' })

    const [found] = await listBooks('current')
    expect(found.sections.map((s) => [s.startChapter, s.endChapter, s.title])).toEqual([
      [1, 5, null],
      [6, 10, 'Lowood'],
    ])
    expect(found.sections.map((s) => s.order)).toEqual([1, 2])
  })

  it('stores a blank title as no title', async () => {
    const book = await newBook()
    const section = await addSection(book.id, { startChapter: 1, endChapter: 5, title: '   ' })
    expect(section.title).toBeNull()
  })

  it('rejects a section outside the chapter bounds', async () => {
    const book = await newBook(30)
    await expect(addSection(book.id, { startChapter: 10, endChapter: 6 })).rejects.toThrow('before the start')
    await expect(addSection(book.id, { startChapter: 0, endChapter: 6 })).rejects.toThrow('Start chapter')
    await expect(addSection(book.id, { startChapter: 28, endChapter: 31 })).rejects.toThrow('past the book')
    expect(await prisma.section.count()).toBe(0)
  })

  it('throws a ValidationError, not a plain Error, for bad input', async () => {
    const book = await newBook(30)
    const section = await addSection(book.id, { startChapter: 1, endChapter: 5 })

    await expect(newBook(0)).rejects.toBeInstanceOf(ValidationError)
    await expect(addSection(book.id, { startChapter: 28, endChapter: 31 })).rejects.toBeInstanceOf(ValidationError)
    await expect(updateSection(section.id, { startChapter: 9, endChapter: 2 })).rejects.toBeInstanceOf(ValidationError)
    await expect(updateTotalChapters(book.id, 3)).rejects.toBeInstanceOf(ValidationError)
  })

  it('rejects a new section that overlaps an existing thread, and saves nothing', async () => {
    const book = await newBook(30)
    await addSection(book.id, { startChapter: 11, endChapter: 20 })

    await expect(addSection(book.id, { startChapter: 1, endChapter: 12 })).rejects.toThrow('overlaps')
    expect(await prisma.section.count()).toBe(1)
  })

  it('allows threads that touch end to start, and a gap between threads', async () => {
    const book = await newBook(30)
    await addSection(book.id, { startChapter: 1, endChapter: 10 })
    await addSection(book.id, { startChapter: 11, endChapter: 20 })
    await addSection(book.id, { startChapter: 25, endChapter: 30 })
    expect(await prisma.section.count()).toBe(3)
  })

  it('rejects editing a section into its neighbour, but allows resizing within its own space', async () => {
    const book = await newBook(30)
    const first = await addSection(book.id, { startChapter: 1, endChapter: 10 })
    await addSection(book.id, { startChapter: 11, endChapter: 20 })

    await expect(updateSection(first.id, { startChapter: 1, endChapter: 12 })).rejects.toThrow('overlaps')
    await updateSection(first.id, { startChapter: 1, endChapter: 9 })

    expect((await prisma.section.findUniqueOrThrow({ where: { id: first.id } })).endChapter).toBe(9)
  })

  it('accepts a single-chapter section', async () => {
    const book = await newBook()
    const section = await addSection(book.id, { startChapter: 7, endChapter: 7 })
    expect(section.startChapter).toBe(7)
  })

  it('keeps assigning the next order after a section in the middle is deleted', async () => {
    const book = await newBook()
    const first = await addSection(book.id, { startChapter: 1, endChapter: 5 })
    await addSection(book.id, { startChapter: 6, endChapter: 10 })
    await deleteSection(first.id)

    const third = await addSection(book.id, { startChapter: 11, endChapter: 15 })

    expect(third.order).toBe(3)
  })

  it('filters by status', async () => {
    const current = await newBook()
    const past = await createBook({ title: 'Old Book', author: 'Someone', totalChapters: 10 })
    await markBookPast(past.id)

    expect((await listBooks('current')).map((b) => b.id)).toEqual([current.id])
    expect((await listBooks('past')).map((b) => b.id)).toEqual([past.id])
  })

  it('makes the first book current, later books upcoming, and a book added with no current book current', async () => {
    const first = await newBook()
    const second = await createBook({ title: 'Emma', author: 'Jane Austen', totalChapters: 30 })
    expect(first.status).toBe('current')
    expect(second.status).toBe('upcoming')

    await markBookPast(first.id)
    const third = await createBook({ title: 'Persuasion', author: 'Jane Austen', totalChapters: 24 })
    expect(third.status).toBe('current')
  })

  it('adds a current book after the only current book is deleted', async () => {
    const only = await newBook()
    await deleteBook(only.id)
    const next = await createBook({ title: 'Emma', author: 'Jane Austen', totalChapters: 30 })
    expect(next.status).toBe('current')
  })

  it('makeBookCurrent moves the old current book to the shelf, from upcoming or from past', async () => {
    const a = await newBook()
    const b = await createBook({ title: 'Emma', author: 'Jane Austen', totalChapters: 30 })
    const status = async (id: string) => (await prisma.book.findUniqueOrThrow({ where: { id } })).status

    await makeBookCurrent(b.id)
    expect([await status(a.id), await status(b.id)]).toEqual(['past', 'current'])

    await makeBookCurrent(a.id)
    expect([await status(a.id), await status(b.id)]).toEqual(['current', 'past'])
  })

  it('makeBookCurrent leaves exactly one current book, heals duplicates, and leaves other upcoming books alone', async () => {
    const make = (title: string, status: string) =>
      prisma.book.create({ data: { title, author: 'A', totalChapters: 10, status } })
    const x = await make('X', 'current')
    const y = await make('Y', 'current')
    const u1 = await make('U1', 'upcoming')
    const u2 = await make('U2', 'upcoming')

    await makeBookCurrent(u1.id)

    const byId = Object.fromEntries((await prisma.book.findMany()).map((b) => [b.id, b.status]))
    expect(byId).toEqual({ [x.id]: 'past', [y.id]: 'past', [u1.id]: 'current', [u2.id]: 'upcoming' })
  })

  it('makeBookCurrent on the book that is already current changes nothing', async () => {
    const a = await newBook()
    const past = await prisma.book.create({ data: { title: 'P', author: 'A', totalChapters: 10, status: 'past' } })

    await makeBookCurrent(a.id)

    expect((await prisma.book.findUniqueOrThrow({ where: { id: a.id } })).status).toBe('current')
    expect((await prisma.book.findUniqueOrThrow({ where: { id: past.id } })).status).toBe('past')
  })

  it("includes each section's post count", async () => {
    const book = await newBook()
    const section = await addSection(book.id, { startChapter: 1, endChapter: 5 })
    const user = await prisma.user.create({ data: { googleId: 'g-books-1', email: 'books1@example.com' } })
    await prisma.post.create({ data: { sectionId: section.id, userId: user.id, body: 'Hi' } })
    await prisma.post.create({ data: { sectionId: section.id, userId: user.id, body: 'Hi again' } })

    const [found] = await listBooks('current')
    expect(found.sections[0]._count.posts).toBe(2)
  })

  it("updates a section's range and title", async () => {
    const book = await newBook()
    const section = await addSection(book.id, { startChapter: 1, endChapter: 5 })

    await updateSection(section.id, { startChapter: 1, endChapter: 6, title: 'Gateshead' })

    const [found] = await listBooks('current')
    expect(found.sections[0]).toMatchObject({ startChapter: 1, endChapter: 6, title: 'Gateshead' })
  })

  it('rejects an update outside the chapter bounds and leaves the section alone', async () => {
    const book = await newBook(30)
    const section = await addSection(book.id, { startChapter: 1, endChapter: 5 })

    await expect(updateSection(section.id, { startChapter: 1, endChapter: 31 })).rejects.toThrow('past the book')

    const [found] = await listBooks('current')
    expect(found.sections[0].endChapter).toBe(5)
  })

  it('unlocks a newly added section for readers who are already far enough along', async () => {
    const book = await newBook()
    const user = await prisma.user.create({ data: { googleId: 'g-books-3', email: 'books3@example.com' } })
    await setProgress(user.id, book.id, 12)

    const section = await addSection(book.id, { startChapter: 6, endChapter: 10 })

    const membership = await prisma.threadMembership.findUnique({
      where: { userId_sectionId: { userId: user.id, sectionId: section.id } },
    })
    expect(membership).not.toBeNull()
  })

  it('unlocks a thread for a reader when an edit brings its last chapter within their progress', async () => {
    const book = await newBook()
    const user = await prisma.user.create({ data: { googleId: 'g-books-4', email: 'books4@example.com' } })
    const section = await addSection(book.id, { startChapter: 6, endChapter: 20 })
    await setProgress(user.id, book.id, 12)
    expect(await prisma.threadMembership.count({ where: { sectionId: section.id } })).toBe(0)

    await updateSection(section.id, { startChapter: 6, endChapter: 12 })

    expect(await prisma.threadMembership.count({ where: { sectionId: section.id } })).toBe(1)
  })

  it('does not re-seal a thread when an edit moves its last chapter past the reader', async () => {
    const book = await newBook()
    const user = await prisma.user.create({ data: { googleId: 'g-books-5', email: 'books5@example.com' } })
    const section = await addSection(book.id, { startChapter: 6, endChapter: 10 })
    await setProgress(user.id, book.id, 12)
    expect(await prisma.threadMembership.count({ where: { sectionId: section.id } })).toBe(1)

    await updateSection(section.id, { startChapter: 6, endChapter: 20 })

    expect(await prisma.threadMembership.count({ where: { sectionId: section.id } })).toBe(1)
  })

  it("updates a book's total chapters", async () => {
    const book = await newBook(30)
    await updateTotalChapters(book.id, 40)
    expect((await prisma.book.findUniqueOrThrow({ where: { id: book.id } })).totalChapters).toBe(40)
  })

  it('refuses a total below where the last thread ends, or an invalid total', async () => {
    const book = await newBook(30)
    await addSection(book.id, { startChapter: 21, endChapter: 30 })

    await expect(updateTotalChapters(book.id, 25)).rejects.toThrow('cannot be less than 30')
    await expect(updateTotalChapters(book.id, 0)).rejects.toThrow('Total chapters')
    expect((await prisma.book.findUniqueOrThrow({ where: { id: book.id } })).totalChapters).toBe(30)
  })

  it('refuses a total below the last named chapter, until that name is cleared', async () => {
    const book = await newBook(30)
    await setChapterNames(book.id, { 24: 'X' })
    await expect(updateTotalChapters(book.id, 20)).rejects.toThrow(
      'Total chapters cannot be less than 24, the last chapter with a name'
    )
    await setChapterNames(book.id, {})
    await updateTotalChapters(book.id, 20)
    expect((await prisma.book.findUniqueOrThrow({ where: { id: book.id } })).totalChapters).toBe(20)
  })

  it('allows lowering the total when there are no sections beyond it', async () => {
    const book = await newBook(30)
    await updateTotalChapters(book.id, 12)
    expect((await prisma.book.findUniqueOrThrow({ where: { id: book.id } })).totalChapters).toBe(12)
  })

  it('deletes an empty section', async () => {
    const book = await newBook()
    const section = await addSection(book.id, { startChapter: 1, endChapter: 5 })

    await deleteSection(section.id)

    const [found] = await listBooks('current')
    expect(found.sections).toHaveLength(0)
  })

  it('deletes a section along with its posts and memberships', async () => {
    const book = await newBook()
    const section = await addSection(book.id, { startChapter: 1, endChapter: 5 })
    const user = await prisma.user.create({ data: { googleId: 'g-books-2', email: 'books2@example.com' } })
    await prisma.threadMembership.create({ data: { userId: user.id, sectionId: section.id } })
    await prisma.post.create({ data: { sectionId: section.id, userId: user.id, body: 'Spoilers!' } })

    await deleteSection(section.id)

    expect(await prisma.section.findUnique({ where: { id: section.id } })).toBeNull()
    expect(await prisma.post.count({ where: { sectionId: section.id } })).toBe(0)
    expect(await prisma.threadMembership.count({ where: { sectionId: section.id } })).toBe(0)
  })

  it('deletes a book along with its sections, posts, memberships and reading progress, leaving other books alone', async () => {
    const doomed = await newBook()
    const kept = await createBook({ title: 'Emma', author: 'Jane Austen', totalChapters: 30 })
    const doomedSection = await addSection(doomed.id, { startChapter: 1, endChapter: 5 })
    const keptSection = await addSection(kept.id, { startChapter: 1, endChapter: 5 })
    const user = await prisma.user.create({ data: { googleId: 'g-books-del', email: 'booksdel@example.com' } })
    await setProgress(user.id, doomed.id, 12)
    await setProgress(user.id, kept.id, 8)
    const top = await prisma.post.create({ data: { sectionId: doomedSection.id, userId: user.id, body: 'Hi' } })
    await prisma.post.create({ data: { sectionId: doomedSection.id, userId: user.id, body: 'Re', parentPostId: top.id } })
    await prisma.post.create({ data: { sectionId: keptSection.id, userId: user.id, body: 'Keep me' } })

    await deleteBook(doomed.id)

    expect((await prisma.book.findMany()).map((b) => b.id)).toEqual([kept.id])
    expect((await prisma.section.findMany()).map((s) => s.id)).toEqual([keptSection.id])
    expect(await prisma.post.count()).toBe(1)
    expect((await prisma.readingProgress.findMany()).map((p) => p.bookId)).toEqual([kept.id])
    expect((await prisma.threadMembership.findMany()).map((m) => m.sectionId)).toEqual([keptSection.id])
  })

  it('deletes a book that has no sections', async () => {
    const book = await newBook()
    await deleteBook(book.id)
    expect(await prisma.book.count()).toBe(0)
  })

  it('sets a trimmed blurb and clears it with empty text', async () => {
    const book = await newBook()

    await setBlurb(book.id, '  An orphaned girl.  ')
    expect((await prisma.book.findUniqueOrThrow({ where: { id: book.id } })).blurb).toBe('An orphaned girl.')

    await setBlurb(book.id, '   ')
    expect((await prisma.book.findUniqueOrThrow({ where: { id: book.id } })).blurb).toBeNull()
  })

  it('accepts a blurb of exactly 1000 characters and rejects 1001, leaving the blurb unchanged', async () => {
    const book = await newBook()
    await setBlurb(book.id, 'a'.repeat(1000))

    await expect(setBlurb(book.id, 'b'.repeat(1001))).rejects.toBeInstanceOf(ValidationError)

    expect((await prisma.book.findUniqueOrThrow({ where: { id: book.id } })).blurb).toBe('a'.repeat(1000))
  })

  it('setReadMonth stores a month, clears with empty, and rejects bad input without saving', async () => {
    const book = await prisma.book.create({ data: { title: 'Rebecca', author: 'Daphne du Maurier', totalChapters: 27 } })

    await setReadMonth(book.id, '2026-09')
    expect((await prisma.book.findUniqueOrThrow({ where: { id: book.id } })).readMonth).toBe('2026-09')

    await expect(setReadMonth(book.id, '2026-13')).rejects.toThrow(ValidationError)
    expect((await prisma.book.findUniqueOrThrow({ where: { id: book.id } })).readMonth).toBe('2026-09')

    await setReadMonth(book.id, '')
    expect((await prisma.book.findUniqueOrThrow({ where: { id: book.id } })).readMonth).toBeNull()
  })

  it('setGenre stores a listed genre, clears with empty, and rejects anything else without saving', async () => {
    const book = await prisma.book.create({ data: { title: 'Rebecca', author: 'Daphne du Maurier', totalChapters: 27 } })
    const stored = async () => (await prisma.book.findUniqueOrThrow({ where: { id: book.id } })).genre

    await setGenre(book.id, 'Mystery')
    expect(await stored()).toBe('Mystery')

    await expect(setGenre(book.id, 'Cookbooks')).rejects.toThrow(ValidationError)
    expect(await stored()).toBe('Mystery')

    await setGenre(book.id, '')
    expect(await stored()).toBeNull()
  })
})
