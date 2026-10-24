import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { createBook, deleteBook } from '@/lib/books'
import { getChapterNames, highestNamedChapter, setChapterNames } from '@/lib/chapter-names'
import { ValidationError } from '@/lib/errors'

async function newBook() {
  return createBook({ title: 'Dune', author: 'Frank Herbert', totalChapters: 10 })
}

describe('chapter names', () => {
  beforeEach(async () => {
    await prisma.chapterName.deleteMany()
    await prisma.readingProgress.deleteMany()
    await prisma.post.deleteMany()
    await prisma.threadMembership.deleteMany()
    await prisma.section.deleteMany()
    await prisma.book.deleteMany()
    await prisma.user.deleteMany()
  })

  it('saves and reads back names by number', async () => {
    const book = await newBook()
    await setChapterNames(book.id, { 1: 'Arrivals', 7: 'B&B' })
    expect(await getChapterNames(book.id)).toEqual({ 1: 'Arrivals', 7: 'B&B' })
  })

  it('trims names and drops blank ones', async () => {
    const book = await newBook()
    await setChapterNames(book.id, { 1: '  B&B  ', 2: '   ', 3: '' })
    expect(await getChapterNames(book.id)).toEqual({ 1: 'B&B' })
  })

  it('replaces earlier names', async () => {
    const book = await newBook()
    await setChapterNames(book.id, { 1: 'A', 2: 'B' })
    await setChapterNames(book.id, { 2: 'C' })
    expect(await getChapterNames(book.id)).toEqual({ 2: 'C' })
  })

  it('rejects a name over 100 characters and keeps the earlier names', async () => {
    const book = await newBook()
    await setChapterNames(book.id, { 1: 'A' })
    await expect(setChapterNames(book.id, { 1: 'x'.repeat(101) })).rejects.toBeInstanceOf(ValidationError)
    expect(await getChapterNames(book.id)).toEqual({ 1: 'A' })
    await setChapterNames(book.id, { 1: 'x'.repeat(100) })
    expect(await getChapterNames(book.id)).toEqual({ 1: 'x'.repeat(100) })
  })

  it('rejects chapter numbers outside the book', async () => {
    const book = await newBook()
    await expect(setChapterNames(book.id, { 0: 'A' })).rejects.toBeInstanceOf(ValidationError)
    await expect(setChapterNames(book.id, { 11: 'A' })).rejects.toBeInstanceOf(ValidationError)
    await expect(setChapterNames(book.id, { 1.5: 'A' })).rejects.toBeInstanceOf(ValidationError)
  })

  it('reports the highest named chapter, or 0 with no names', async () => {
    const book = await newBook()
    expect(await highestNamedChapter(book.id)).toBe(0)
    await setChapterNames(book.id, { 2: 'A', 7: 'B' })
    expect(await highestNamedChapter(book.id)).toBe(7)
  })

  it('deleteBook removes chapter names', async () => {
    const book = await newBook()
    await setChapterNames(book.id, { 1: 'A' })
    await deleteBook(book.id)
    expect(await prisma.chapterName.count()).toBe(0)
  })
})
