import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'

const mockRequireAdmin = vi.fn()
vi.mock('@/lib/session', () => ({ requireAdmin: () => mockRequireAdmin() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { createBookAction, addAllowedEmailAction } from '@/app/admin/actions'

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
})
