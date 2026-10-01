import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { createBook, deleteBook } from '@/lib/books'
import { setBookCover, getBookCover, removeBookCover, MAX_COVER_BYTES } from '@/lib/covers'

// Minimal valid headers; the rest of the bytes don't matter for type detection.
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.from([4, 0, 0, 0]), Buffer.from('WEBP'), Buffer.from([1, 2])])

describe('book covers', () => {
  beforeEach(async () => {
    await prisma.bookCover.deleteMany()
    await prisma.readingProgress.deleteMany()
    await prisma.post.deleteMany()
    await prisma.threadMembership.deleteMany()
    await prisma.section.deleteMany()
    await prisma.book.deleteMany()
  })

  async function newBook() {
    return createBook({ title: 'Dune', author: 'Frank Herbert', totalChapters: 30 })
  }

  it.each([
    ['png', PNG, 'image/png'],
    ['jpeg', JPEG, 'image/jpeg'],
    ['webp', WEBP, 'image/webp'],
  ])('stores a %s cover and detects its type from the bytes', async (_name, bytes, type) => {
    const book = await newBook()
    await setBookCover(book.id, bytes)

    const cover = await getBookCover(book.id)
    expect(cover?.contentType).toBe(type)
    expect(Buffer.from(cover!.data).equals(bytes)).toBe(true)
  })

  it('replaces an existing cover', async () => {
    const book = await newBook()
    await setBookCover(book.id, PNG)
    await setBookCover(book.id, JPEG)

    expect((await getBookCover(book.id))?.contentType).toBe('image/jpeg')
    expect(await prisma.bookCover.count()).toBe(1)
  })

  it('rejects files over the size limit', async () => {
    const book = await newBook()
    const big = Buffer.concat([PNG, Buffer.alloc(MAX_COVER_BYTES)])

    await expect(setBookCover(book.id, big)).rejects.toThrow('KB')
    expect(await getBookCover(book.id)).toBeNull()
  })

  it('rejects files that are not PNG, JPEG, or WebP images', async () => {
    const book = await newBook()
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')

    await expect(setBookCover(book.id, svg)).rejects.toThrow('PNG, JPEG, or WebP')
    await expect(setBookCover(book.id, Buffer.from('GIF89a....'))).rejects.toThrow('PNG, JPEG, or WebP')
    await expect(setBookCover(book.id, Buffer.alloc(0))).rejects.toThrow('PNG, JPEG, or WebP')
    expect(await getBookCover(book.id)).toBeNull()
  })

  it('removes a cover', async () => {
    const book = await newBook()
    await setBookCover(book.id, PNG)
    await removeBookCover(book.id)

    expect(await getBookCover(book.id)).toBeNull()
  })

  it('removing a cover that does not exist is fine', async () => {
    const book = await newBook()
    await expect(removeBookCover(book.id)).resolves.toBeUndefined()
  })

  it('is deleted along with its book', async () => {
    const book = await newBook()
    await setBookCover(book.id, PNG)

    await deleteBook(book.id)

    expect(await prisma.bookCover.count()).toBe(0)
    expect(await prisma.book.count()).toBe(0)
  })
})
