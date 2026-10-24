import { describe, it, expect } from 'vitest'
import { BLURB_MAX, CHAPTER_NAME_MAX, CLUB_NAME_MAX, validateBlurb, validateChapterName, validateClubName, validateReadMonth } from '@/lib/limits'

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

describe('validateReadMonth', () => {
  const now = new Date('2026-10-04T12:00:00Z')

  it('accepts empty (clear) and real months from 2000 to next year', () => {
    expect(validateReadMonth('', now)).toBeNull()
    expect(validateReadMonth('2000-01', now)).toBeNull()
    expect(validateReadMonth('2026-09', now)).toBeNull()
    expect(validateReadMonth('2027-12', now)).toBeNull()
  })

  it('rejects bad formats, impossible months and out-of-range years', () => {
    for (const bad of ['2026-9', '26-09', '2026/09', 'September 2026', '2026-00', '2026-13', '1999-12', '2028-01', ' 2026-09']) {
      expect(validateReadMonth(bad, now)).toBe('Choose a month and year between 2000 and 2027')
    }
  })
})

describe('validateChapterName', () => {
  it('accepts exactly 100 characters and rejects 101', () => {
    expect(CHAPTER_NAME_MAX).toBe(100)
    expect(validateChapterName('x'.repeat(100))).toBeNull()
    expect(validateChapterName('x'.repeat(101))).toBe('Chapter names can be at most 100 characters')
  })
})
