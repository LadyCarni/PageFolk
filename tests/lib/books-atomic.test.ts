import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'

vi.mock('@/lib/progress', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/progress')>()
  return { ...actual, syncUnlocksForBook: vi.fn(actual.syncUnlocksForBook) }
})

import { syncUnlocksForBook } from '@/lib/progress'
import { createBook, addSection, updateSection } from '@/lib/books'

describe('section writes and the unlock sync are atomic', () => {
  beforeEach(async () => {
    vi.mocked(syncUnlocksForBook).mockClear()
    await prisma.readingProgress.deleteMany()
    await prisma.post.deleteMany()
    await prisma.threadMembership.deleteMany()
    await prisma.section.deleteMany()
    await prisma.book.deleteMany()
    await prisma.user.deleteMany()
  })

  it('addSection leaves no section behind when the unlock sync fails', async () => {
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert', totalChapters: 30 })
    vi.mocked(syncUnlocksForBook).mockRejectedValueOnce(new Error('sync failed'))

    await expect(addSection(book.id, { startChapter: 1, endChapter: 5 })).rejects.toThrow('sync failed')

    expect(await prisma.section.count()).toBe(0)
  })

  it('updateSection leaves the section unchanged when the unlock sync fails', async () => {
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert', totalChapters: 30 })
    const section = await addSection(book.id, { startChapter: 1, endChapter: 5 })
    vi.mocked(syncUnlocksForBook).mockRejectedValueOnce(new Error('sync failed'))

    await expect(updateSection(section.id, { startChapter: 1, endChapter: 9, title: 'Changed' })).rejects.toThrow(
      'sync failed'
    )

    const after = await prisma.section.findUniqueOrThrow({ where: { id: section.id } })
    expect(after).toMatchObject({ startChapter: 1, endChapter: 5, title: null })
  })
})
