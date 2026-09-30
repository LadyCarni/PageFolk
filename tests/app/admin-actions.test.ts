import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'

const mockRequireAdmin = vi.fn()
vi.mock('@/lib/session', () => ({ requireAdmin: () => mockRequireAdmin() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { createBookAction, addAllowedEmailAction, updateSectionLabelAction, deleteSectionAction } from '@/app/admin/actions'
import { createBook, addSection } from '@/lib/books'

describe('admin actions', () => {
  beforeEach(async () => {
    mockRequireAdmin.mockReset()
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
    const section = await addSection(book.id, 'Chapters 1-5', 1)

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
    const section = await addSection(book.id, 'Chapters 1-5', 1)

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
    const section = await addSection(book.id, 'Chapters 1-5', 1)

    await deleteSectionAction(section.id)

    expect(await prisma.section.findUnique({ where: { id: section.id } })).toBeNull()
  })
})
