import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'

const mockRequireAdmin = vi.fn()
vi.mock('@/lib/session', () => ({ requireAdmin: () => mockRequireAdmin() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { createBookAction, addAllowedEmailAction, addSectionAction, updateSectionAction, updateTotalChaptersAction, deleteSectionAction, deleteBookAction, uploadCoverAction, removeCoverAction } from '@/app/admin/actions'
import { createBook, addSection } from '@/lib/books'

describe('admin actions', () => {
  beforeEach(async () => {
    mockRequireAdmin.mockReset()
    await prisma.readingProgress.deleteMany()
    await prisma.bookCover.deleteMany()
    await prisma.post.deleteMany()
    await prisma.threadMembership.deleteMany()
    await prisma.allowedEmail.deleteMany()
    await prisma.section.deleteMany()
    await prisma.book.deleteMany()
  })

  it('rejects createBookAction for a non-admin', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Forbidden: admin only'))
    const fd = new FormData()
    fd.set('title', 'Dune')
    fd.set('author', 'Frank Herbert')
    await expect(createBookAction(fd)).rejects.toThrow('Forbidden')
  })

  it('creates a book for an admin', async () => {
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
    const fd = new FormData()
    fd.set('title', 'Dune')
    fd.set('author', 'Frank Herbert')
    fd.set('totalChapters', '30')
    const book = await createBookAction(fd)
    expect(book.title).toBe('Dune')
    expect(book.totalChapters).toBe(30)
  })

  it('rejects a title-less book', async () => {
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
    const fd = new FormData()
    fd.set('title', '  ')
    fd.set('author', 'Frank Herbert')
    await expect(createBookAction(fd)).rejects.toThrow('required')
  })

  it('rejects addAllowedEmailAction for a non-admin', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Forbidden: admin only'))
    const fd = new FormData()
    fd.set('email', 'new@example.com')
    await expect(addAllowedEmailAction(fd)).rejects.toThrow('Forbidden')
  })

  it('rejects a book without a valid total chapters', async () => {
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
    for (const bad of ['', 'abc', '0', '2.5']) {
      const fd = new FormData()
      fd.set('title', 'Dune')
      fd.set('author', 'Frank Herbert')
      fd.set('totalChapters', bad)
      await expect(createBookAction(fd)).rejects.toThrow('Total chapters')
    }
    expect(await prisma.book.count()).toBe(0)
  })

  function sectionForm(fields: Record<string, string>) {
    const fd = new FormData()
    for (const [key, value] of Object.entries(fields)) fd.set(key, value)
    return fd
  }

  it('rejects addSectionAction for a non-admin', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Forbidden: admin only'))
    await expect(
      addSectionAction(sectionForm({ bookId: 'whatever', startChapter: '1', endChapter: '5' }))
    ).rejects.toThrow('Forbidden')
  })

  it('adds a section with an optional title for an admin', async () => {
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert', totalChapters: 30 })

    await addSectionAction(sectionForm({ bookId: book.id, startChapter: '6', endChapter: '10', title: ' Lowood ' }))
    await addSectionAction(sectionForm({ bookId: book.id, startChapter: '11', endChapter: '15', title: '' }))

    const sections = await prisma.section.findMany({ where: { bookId: book.id }, orderBy: { order: 'asc' } })
    expect(sections.map((s) => [s.startChapter, s.endChapter, s.title])).toEqual([
      [6, 10, 'Lowood'],
      [11, 15, null],
    ])
  })

  it('rejects a section whose numbers are missing, backwards, or past the total', async () => {
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert', totalChapters: 30 })

    await expect(
      addSectionAction(sectionForm({ bookId: book.id, startChapter: '', endChapter: '5' }))
    ).rejects.toThrow('Start chapter')
    await expect(
      addSectionAction(sectionForm({ bookId: book.id, startChapter: '10', endChapter: '6' }))
    ).rejects.toThrow('before the start')
    await expect(
      addSectionAction(sectionForm({ bookId: book.id, startChapter: '28', endChapter: '31' }))
    ).rejects.toThrow('past the book')
    expect(await prisma.section.count()).toBe(0)
  })

  it('rejects updateSectionAction for a non-admin', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Forbidden: admin only'))
    await expect(
      updateSectionAction(sectionForm({ sectionId: 'whatever', startChapter: '1', endChapter: '5' }))
    ).rejects.toThrow('Forbidden')
  })

  it("updates a section's range and title for an admin", async () => {
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert', totalChapters: 30 })
    const section = await addSection(book.id, { startChapter: 1, endChapter: 5 })

    await updateSectionAction(
      sectionForm({ sectionId: section.id, startChapter: '1', endChapter: '6', title: 'Gateshead' })
    )

    const updated = await prisma.section.findUniqueOrThrow({ where: { id: section.id } })
    expect(updated).toMatchObject({ startChapter: 1, endChapter: 6, title: 'Gateshead' })
  })

  it('requires a sectionId to update', async () => {
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
    await expect(
      updateSectionAction(sectionForm({ sectionId: '', startChapter: '1', endChapter: '5' }))
    ).rejects.toThrow('required')
  })

  it('rejects updateTotalChaptersAction for a non-admin, and updates for an admin', async () => {
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert', totalChapters: 30 })
    const form = sectionForm({ bookId: book.id, totalChapters: '40' })

    mockRequireAdmin.mockRejectedValue(new Error('Forbidden: admin only'))
    await expect(updateTotalChaptersAction(form)).rejects.toThrow('Forbidden')
    expect((await prisma.book.findUniqueOrThrow({ where: { id: book.id } })).totalChapters).toBe(30)

    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
    await updateTotalChaptersAction(form)
    expect((await prisma.book.findUniqueOrThrow({ where: { id: book.id } })).totalChapters).toBe(40)
  })

  it('rejects deleteSectionAction for a non-admin', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Forbidden: admin only'))
    await expect(deleteSectionAction('whatever')).rejects.toThrow('Forbidden')
  })

  it('deletes a section for an admin', async () => {
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert', totalChapters: 30 })
    const section = await addSection(book.id, { startChapter: 1, endChapter: 5 })

    await deleteSectionAction(section.id)

    expect(await prisma.section.findUnique({ where: { id: section.id } })).toBeNull()
  })

  it('rejects deleteBookAction for a non-admin', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Forbidden: admin only'))
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert', totalChapters: 30 })

    await expect(deleteBookAction(book.id)).rejects.toThrow('Forbidden')
    expect(await prisma.book.count()).toBe(1)
  })

  it('deletes a book for an admin', async () => {
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert', totalChapters: 30 })
    await addSection(book.id, { startChapter: 1, endChapter: 5 })

    await deleteBookAction(book.id)

    expect(await prisma.book.findUnique({ where: { id: book.id } })).toBeNull()
  })

  describe('book covers', () => {
    const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])

    function coverForm(bookId: string, bytes: Uint8Array | null, name = 'cover.png') {
      const fd = new FormData()
      fd.set('bookId', bookId)
      if (bytes) fd.set('cover', new File([new Uint8Array(bytes)], name))
      return fd
    }

    it('rejects uploadCoverAction for a non-admin', async () => {
      mockRequireAdmin.mockRejectedValue(new Error('Forbidden: admin only'))
      const book = await createBook({ title: 'Dune', author: 'Frank Herbert', totalChapters: 30 })

      await expect(uploadCoverAction(coverForm(book.id, PNG))).rejects.toThrow('Forbidden')
      expect(await prisma.bookCover.count()).toBe(0)
    })

    it('stores an uploaded cover for an admin', async () => {
      mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
      const book = await createBook({ title: 'Dune', author: 'Frank Herbert', totalChapters: 30 })

      await uploadCoverAction(coverForm(book.id, PNG))

      expect((await prisma.bookCover.findUnique({ where: { bookId: book.id } }))?.contentType).toBe('image/png')
    })

    it('requires a file', async () => {
      mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
      const book = await createBook({ title: 'Dune', author: 'Frank Herbert', totalChapters: 30 })

      await expect(uploadCoverAction(coverForm(book.id, null))).rejects.toThrow('Choose')
      await expect(uploadCoverAction(coverForm(book.id, new Uint8Array(0)))).rejects.toThrow('Choose')
    })

    it('rejects a non-image file', async () => {
      mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
      const book = await createBook({ title: 'Dune', author: 'Frank Herbert', totalChapters: 30 })

      await expect(
        uploadCoverAction(coverForm(book.id, new TextEncoder().encode('not an image'), 'cover.png'))
      ).rejects.toThrow('PNG, JPEG, or WebP')
    })

    it('rejects removeCoverAction for a non-admin, and removes for an admin', async () => {
      const book = await createBook({ title: 'Dune', author: 'Frank Herbert', totalChapters: 30 })
      mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
      await uploadCoverAction(coverForm(book.id, PNG))

      mockRequireAdmin.mockRejectedValue(new Error('Forbidden: admin only'))
      await expect(removeCoverAction(book.id)).rejects.toThrow('Forbidden')
      expect(await prisma.bookCover.count()).toBe(1)

      mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
      await removeCoverAction(book.id)
      expect(await prisma.bookCover.count()).toBe(0)
    })
  })
})
