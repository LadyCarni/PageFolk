import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isAdminEmail } from '@/lib/admin'

describe('isAdminEmail', () => {
  beforeEach(() => {
    vi.stubEnv('ADMIN_EMAIL', 'admin@example.com')
  })

  it('returns true for the configured admin email', () => {
    expect(isAdminEmail('admin@example.com')).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(isAdminEmail('Admin@Example.com')).toBe(true)
  })

  it('returns false for any other email', () => {
    expect(isAdminEmail('someone@example.com')).toBe(false)
  })

  it('returns false for null or undefined', () => {
    expect(isAdminEmail(null)).toBe(false)
    expect(isAdminEmail(undefined)).toBe(false)
  })
})
