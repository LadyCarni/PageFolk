import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuth = vi.fn()
vi.mock('@/auth', () => ({ auth: () => mockAuth() }))

const mockIsEmailAllowed = vi.fn()
vi.mock('@/lib/allowlist', () => ({ isEmailAllowed: (email: string) => mockIsEmailAllowed(email) }))

import { requireUser, requireAdmin } from '@/lib/session'

describe('requireUser', () => {
  beforeEach(() => {
    mockAuth.mockReset()
    mockIsEmailAllowed.mockReset()
    mockIsEmailAllowed.mockResolvedValue(true)
  })

  it('returns the session user when signed in', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', email: 'a@example.com', isAdmin: false } })
    const user = await requireUser()
    expect(user.id).toBe('1')
  })

  it('throws when not signed in', async () => {
    mockAuth.mockResolvedValue(null)
    await expect(requireUser()).rejects.toThrow('Not signed in')
  })

  it('throws when the user has been removed from the allow-list', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', email: 'a@example.com', isAdmin: false } })
    mockIsEmailAllowed.mockResolvedValue(false)
    await expect(requireUser()).rejects.toThrow('Access revoked')
  })
})

describe('requireAdmin', () => {
  beforeEach(() => {
    mockAuth.mockReset()
    mockIsEmailAllowed.mockReset()
    mockIsEmailAllowed.mockResolvedValue(true)
  })

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
