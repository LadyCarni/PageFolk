import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'

const mockRequireAdmin = vi.fn()
vi.mock('@/lib/session', () => ({ requireAdmin: () => mockRequireAdmin() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { createBookAction, addAllowedEmailAction, updateSectionLabelAction, deleteSectionAction, deleteBookAction, uploadCoverAction, removeCoverAction } from '@/app/admin/actions'
import { createBook, addSection } from '@/lib/books'

describe('admin actions', () => {
  beforeEach(async () => {
    mockRequireAdmin.mockReset()
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
    const book = await createBookAction(fd)
    expect(book.title).toBe('Dune')
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

  it('rejects updateSectionLabelAction for a non-admin', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Forbidden: admin only'))
    const fd = new FormData()
    fd.set('sectionId', 'whatever')
    fd.set('label', 'New label')
    await expect(updateSectionLabelAction(fd)).rejects.toThrow('Forbidden')
  })

  it('renames a section for an admin', async () => {
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert' })
    const section = await addSection(book.id, 'Chapters 1-5')

    const fd = new FormData()
    fd.set('sectionId', section.id)
    fd.set('label', 'Chapters 1-6')
    await updateSectionLabelAction(fd)

    const updated = await prisma.section.findUniqueOrThrow({ where: { id: section.id } })
    expect(updated.label).toBe('Chapters 1-6')
  })

  it('rejects a label-less rename', async () => {
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert' })
    const section = await addSection(book.id, 'Chapters 1-5')

    const fd = new FormData()
    fd.set('sectionId', section.id)
    fd.set('label', '   ')
    await expect(updateSectionLabelAction(fd)).rejects.toThrow('required')
  })

  it('rejects deleteSectionAction for a non-admin', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Forbidden: admin only'))
    await expect(deleteSectionAction('whatever')).rejects.toThrow('Forbidden')
  })

  it('deletes a section for an admin', async () => {
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert' })
    const section = await addSection(book.id, 'Chapters 1-5')

    await deleteSectionAction(section.id)

    expect(await prisma.section.findUnique({ where: { id: section.id } })).toBeNull()
  })

  it('rejects deleteBookAction for a non-admin', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Forbidden: admin only'))
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert' })

    await expect(deleteBookAction(book.id)).rejects.toThrow('Forbidden')
    expect(await prisma.book.count()).toBe(1)
  })

  it('deletes a book for an admin', async () => {
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert' })
    await addSection(book.id, 'Chapters 1-5')

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
      const book = await createBook({ title: 'Dune', author: 'Frank Herbert' })

      await expect(uploadCoverAction(coverForm(book.id, PNG))).rejects.toThrow('Forbidden')
      expect(await prisma.bookCover.count()).toBe(0)
    })

    it('stores an uploaded cover for an admin', async () => {
      mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
      const book = await createBook({ title: 'Dune', author: 'Frank Herbert' })

      await uploadCoverAction(coverForm(book.id, PNG))

      expect((await prisma.bookCover.findUnique({ where: { bookId: book.id } }))?.contentType).toBe('image/png')
    })

    it('requires a file', async () => {
      mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
      const book = await createBook({ title: 'Dune', author: 'Frank Herbert' })

      await expect(uploadCoverAction(coverForm(book.id, null))).rejects.toThrow('Choose')
      await expect(uploadCoverAction(coverForm(book.id, new Uint8Array(0)))).rejects.toThrow('Choose')
    })

    it('rejects a non-image file', async () => {
      mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
      const book = await createBook({ title: 'Dune', author: 'Frank Herbert' })

      await expect(
        uploadCoverAction(coverForm(book.id, new TextEncoder().encode('not an image'), 'cover.png'))
      ).rejects.toThrow('PNG, JPEG, or WebP')
    })

    it('rejects removeCoverAction for a non-admin, and removes for an admin', async () => {
      const book = await createBook({ title: 'Dune', author: 'Frank Herbert' })
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
