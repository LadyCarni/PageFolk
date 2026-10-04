import { describe, it, expect } from 'vitest'
import { COVER_COLORS, coverColor } from '@/lib/cover-color'

describe('coverColor', () => {
  it('always gives the same book the same color', () => {
    expect(coverColor('clx9abc123')).toBe(coverColor('clx9abc123'))
  })

  it('uses every color across a set of books', () => {
    const used = new Set(Array.from({ length: 40 }, (_, i) => coverColor(`book-${i}`)))
    expect([...used].sort()).toEqual([...COVER_COLORS].sort())
  })
})
