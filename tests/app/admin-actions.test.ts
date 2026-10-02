import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'

const mockRequireAdmin = vi.fn()
vi.mock('@/lib/session', () => ({ requireAdmin: () => mockRequireAdmin() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

import { createBookAction, addAllowedEmailAction, removeAllowedEmailAction, addSectionAction, updateSectionAction, updateTotalChaptersAction, deleteSectionAction, deleteBookAction, uploadCoverAction, removeCoverAction, updateClubNameAction, updateBlurbAction } from '@/app/admin/actions'
import { getClubName } from '@/lib/club'
import { createBook, addSection } from '@/lib/books'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

describe('admin actions', () => {
  beforeEach(async () => {
    mockRequireAdmin.mockReset()
    vi.mocked(redirect).mockClear()
    vi.mocked(revalidatePath).mockClear()
    await prisma.readingProgress.deleteMany()
    await prisma.bookCover.deleteMany()
    await prisma.post.deleteMany()
    await prisma.threadMembership.deleteMany()
    await prisma.allowedEmail.deleteMany()
    await prisma.section.deleteMany()
    await prisma.book.deleteMany()
    await prisma.club.deleteMany()
  })

  it('rejects createBookAction for a non-admin', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Forbidden: admin only'))
    const fd = new FormData()
    fd.set('title', 'Dune')
    fd.set('author', 'Frank Herbert')
    await expect(createBookAction(fd)).rejects.toThrow('Forbidden')
  })

  it('creates a book for an admin and opens it', async () => {
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
    const fd = new FormData()
    fd.set('title', 'Dune')
    fd.set('author', 'Frank Herbert')
    fd.set('totalChapters', '30')
    expect(await createBookAction(fd)).toEqual({})
    const [book] = await prisma.book.findMany()
    expect(book).toMatchObject({ title: 'Dune', totalChapters: 30 })
    expect(redirect).toHaveBeenCalledWith(`/admin?book=${book.id}`)
  })

  it('does not redirect when a new book is rejected', async () => {
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
    const fd = new FormData()
    fd.set('title', 'Dune')
    fd.set('author', 'Frank Herbert')
    fd.set('totalChapters', '0')
    expect(await createBookAction(fd)).toEqual({ error: 'Total chapters must be a whole number of at least 1' })
    expect(redirect).not.toHaveBeenCalled()
  })

  it('refreshes the Members page when allowed emails change', async () => {
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
    const fd = new FormData()
    fd.set('email', 'New@Example.com')
    await addAllowedEmailAction(fd)
    expect(await prisma.allowedEmail.findMany()).toEqual([expect.objectContaining({ email: 'new@example.com' })])
    expect(revalidatePath).toHaveBeenCalledWith('/members')

    vi.mocked(revalidatePath).mockClear()
    await removeAllowedEmailAction('new@example.com')
    expect(await prisma.allowedEmail.count()).toBe(0)
    expect(revalidatePath).toHaveBeenCalledWith('/members')
  })

  it('rejects removeAllowedEmailAction for a non-admin', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Forbidden: admin only'))
    await expect(removeAllowedEmailAction('a@example.com')).rejects.toThrow('Forbidden')
  })

  it('rejects a title-less book', async () => {
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
    const fd = new FormData()
    fd.set('title', '  ')
    fd.set('author', 'Frank Herbert')
    fd.set('totalChapters', '30')
    expect(await createBookAction(fd)).toEqual({ error: 'Title and author are required' })
    expect(await prisma.book.count()).toBe(0)
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
      expect(await createBookAction(fd)).toEqual({
        error: 'Total chapters must be a whole number of at least 1',
      })
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

    const missing = await addSectionAction(sectionForm({ bookId: book.id, startChapter: '', endChapter: '5' }))
    const backwards = await addSectionAction(sectionForm({ bookId: book.id, startChapter: '10', endChapter: '6' }))
    const pastTotal = await addSectionAction(sectionForm({ bookId: book.id, startChapter: '28', endChapter: '31' }))

    expect(missing.error).toContain('Start chapter')
    expect(backwards.error).toContain('before the start')
    expect(pastTotal.error).toContain('past the book')
    expect(await prisma.section.count()).toBe(0)
  })

  it('returns an error, and saves nothing, when a new section overlaps another', async () => {
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert', totalChapters: 30 })
    await addSection(book.id, { startChapter: 11, endChapter: 20 })

    const result = await addSectionAction(sectionForm({ bookId: book.id, startChapter: '1', endChapter: '12' }))

    expect(result.error).toContain('overlaps')
    expect(await prisma.section.count()).toBe(1)
  })

  it('returns an error and leaves the section alone when an edit goes past the total or into a neighbour', async () => {
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert', totalChapters: 30 })
    const first = await addSection(book.id, { startChapter: 1, endChapter: 10 })
    await addSection(book.id, { startChapter: 11, endChapter: 20 })

    const pastTotal = await updateSectionAction(
      sectionForm({ sectionId: first.id, startChapter: '1', endChapter: '31' })
    )
    const overlap = await updateSectionAction(
      sectionForm({ sectionId: first.id, startChapter: '1', endChapter: '12' })
    )

    expect(pastTotal.error).toContain('past the book')
    expect(overlap.error).toContain('overlaps')
    expect((await prisma.section.findUniqueOrThrow({ where: { id: first.id } })).endChapter).toBe(10)
  })

  it('returns an error and keeps the total when it would drop below where the last thread ends', async () => {
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert', totalChapters: 30 })
    await addSection(book.id, { startChapter: 21, endChapter: 30 })

    const result = await updateTotalChaptersAction(sectionForm({ bookId: book.id, totalChapters: '25' }))

    expect(result.error).toContain('cannot be less than 30')
    expect((await prisma.book.findUniqueOrThrow({ where: { id: book.id } })).totalChapters).toBe(30)
  })

  it('returns an empty result on success, so forms show no error', async () => {
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert', totalChapters: 30 })

    expect(await addSectionAction(sectionForm({ bookId: book.id, startChapter: '1', endChapter: '5' }))).toEqual({})
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

  it('rejects updateClubNameAction for a non-admin', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Forbidden: admin only'))
    await expect(updateClubNameAction(sectionForm({ clubName: 'The Thursday Readers' }))).rejects.toThrow('Forbidden')
    expect(await getClubName()).toBeNull()
  })

  it('sets the club name for an admin, and reports blank or over-long names without saving', async () => {
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })

    expect(await updateClubNameAction(sectionForm({ clubName: ' The Thursday Readers ' }))).toEqual({})
    expect(await getClubName()).toBe('The Thursday Readers')

    expect(await updateClubNameAction(sectionForm({ clubName: '   ' }))).toEqual({ error: 'Club name is required' })
    expect((await updateClubNameAction(sectionForm({ clubName: 'a'.repeat(41) }))).error).toContain('40 characters')
    expect(await getClubName()).toBe('The Thursday Readers')
  })

  it('rejects updateBlurbAction for a non-admin', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Forbidden: admin only'))
    await expect(updateBlurbAction(sectionForm({ bookId: 'whatever', blurb: 'x' }))).rejects.toThrow('Forbidden')
  })

  it('sets and clears a blurb for an admin, and reports an over-long one without saving', async () => {
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
    const book = await createBook({ title: 'Dune', author: 'Frank Herbert', totalChapters: 30 })

    expect(await updateBlurbAction(sectionForm({ bookId: book.id, blurb: 'A desert planet.' }))).toEqual({})
    expect((await prisma.book.findUniqueOrThrow({ where: { id: book.id } })).blurb).toBe('A desert planet.')

    const tooLong = await updateBlurbAction(sectionForm({ bookId: book.id, blurb: 'a'.repeat(1001) }))
    expect(tooLong.error).toContain('1000 characters')
    expect((await prisma.book.findUniqueOrThrow({ where: { id: book.id } })).blurb).toBe('A desert planet.')

    expect(await updateBlurbAction(sectionForm({ bookId: book.id, blurb: '' }))).toEqual({})
    expect((await prisma.book.findUniqueOrThrow({ where: { id: book.id } })).blurb).toBeNull()
  })

  it('requires a bookId to set a blurb', async () => {
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', isAdmin: true })
    await expect(updateBlurbAction(sectionForm({ bookId: '', blurb: 'x' }))).rejects.toThrow('required')
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
