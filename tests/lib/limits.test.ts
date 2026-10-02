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

  it('accepts exactly 60 characters and rejects 61', () => {
    expect(CLUB_NAME_MAX).toBe(60)
    expect(validateClubName('a'.repeat(60))).toBeNull()
    expect(validateClubName('a'.repeat(61))).toBe('Club name must be 60 characters or fewer')
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
