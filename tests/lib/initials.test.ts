import { describe, it, expect } from 'vitest'
import { getInitials, avatarColorIndex } from '@/lib/initials'

describe('getInitials', () => {
  it('uses the first letters of the first and last names', () => {
    expect(getInitials('Caryn Farvour')).toBe('CF')
  })

  it('skips middle names', () => {
    expect(getInitials('Mary Jane Watson')).toBe('MW')
  })

  it('uses a single initial for a single name', () => {
    expect(getInitials('Cher')).toBe('C')
  })

  it('uppercases and ignores extra whitespace', () => {
    expect(getInitials('  ada   lovelace ')).toBe('AL')
  })

  it('handles non-Latin letters', () => {
    expect(getInitials('José Ñandú')).toBe('JÑ')
    expect(getInitials('李 雷')).toBe('李雷')
  })

  it('ignores emoji and punctuation when picking letters', () => {
    expect(getInitials('🎉 Sam "The Man" Lee')).toBe('SL')
    expect(getInitials('🎉')).toBe('?')
  })

  it('falls back to ? when there is no usable name', () => {
    expect(getInitials(null)).toBe('?')
    expect(getInitials(undefined)).toBe('?')
    expect(getInitials('   ')).toBe('?')
  })
})

describe('avatarColorIndex', () => {
  it('is stable for the same id', () => {
    expect(avatarColorIndex('user-1', 6)).toBe(avatarColorIndex('user-1', 6))
  })

  it('stays within range', () => {
    for (const id of ['a', 'b', 'cmuoc7yxu0000zromvahi1en0', '', 'zzzzzzzzzz']) {
      const i = avatarColorIndex(id, 6)
      expect(i).toBeGreaterThanOrEqual(0)
      expect(i).toBeLessThan(6)
    }
  })
})
