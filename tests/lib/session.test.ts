import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuth = vi.fn()
vi.mock('@/auth', () => ({ auth: () => mockAuth() }))

import { requireUser, requireAdmin } from '@/lib/session'

describe('requireUser', () => {
  beforeEach(() => mockAuth.mockReset())

  it('returns the session user when signed in', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', email: 'a@example.com', isAdmin: false } })
    const user = await requireUser()
    expect(user.id).toBe('1')
  })

  it('throws when not signed in', async () => {
    mockAuth.mockResolvedValue(null)
    await expect(requireUser()).rejects.toThrow('Not signed in')
  })
})

describe('requireAdmin', () => {
  beforeEach(() => mockAuth.mockReset())

  it('returns the user when they are an admin', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', email: 'a@example.com', isAdmin: true } })
    const user = await requireAdmin()
    expect(user.isAdmin).toBe(true)
  })

  it('throws Forbidden when the user is not an admin', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', email: 'a@example.com', isAdmin: false } })
    await expect(requireAdmin()).rejects.toThrow('Forbidden')
  })
})
