import { describe, it, expect } from 'vitest'
import { BLURB_MAX, CLUB_NAME_MAX, validateBlurb, validateClubName } from '@/lib/limits'

describe('validateClubName', () => {
  it('accepts a normal name, counting characters after trimming', () => {
    expect(validateClubName('The Thursday Readers')).toBeNull()
    expect(validateClubName('  x  ')).toBeNull()
  })

  it('rejects blank and whitespace-only names', () => {
    expect(validateClubName('')).toBe('Club name is required')
    expect(validateClubName('   ')).toBe('Club name is required')
  })

  it('accepts exactly 40 characters and rejects 41', () => {
    expect(CLUB_NAME_MAX).toBe(40)
    expect(validateClubName('a'.repeat(40))).toBeNull()
    expect(validateClubName('a'.repeat(41))).toBe('Club name must be 40 characters or fewer')
  })
})

describe('validateBlurb', () => {
  it('accepts empty and whitespace-only text (they clear the blurb)', () => {
    expect(validateBlurb('')).toBeNull()
    expect(validateBlurb('   ')).toBeNull()
  })

  it('accepts exactly 1000 characters and rejects 1001, ignoring surrounding whitespace', () => {
    expect(BLURB_MAX).toBe(1000)
    expect(validateBlurb('a'.repeat(1000))).toBeNull()
    expect(validateBlurb(`  ${'a'.repeat(1000)}  `)).toBeNull()
    expect(validateBlurb('a'.repeat(1001))).toBe('Blurb must be 1000 characters or fewer')
  })
})
