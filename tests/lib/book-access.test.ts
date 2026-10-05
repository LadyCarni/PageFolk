import { describe, it, expect } from 'vitest'
import { canViewBook } from '@/lib/book-access'

describe('canViewBook', () => {
  it('lets everyone see current and past books', () => {
    for (const isAdmin of [true, false]) {
      expect(canViewBook('current', isAdmin)).toBe(true)
      expect(canViewBook('past', isAdmin)).toBe(true)
    }
  })

  it('keeps upcoming books to admins', () => {
    expect(canViewBook('upcoming', true)).toBe(true)
    expect(canViewBook('upcoming', false)).toBe(false)
  })
})
