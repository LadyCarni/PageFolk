import { describe, it, expect } from 'vitest'
import { MONTH_NAMES, formatReadMonth, readMonthFromParts, readMonthYears, splitReadMonth } from '@/lib/read-month'

const now = new Date('2026-10-04T12:00:00Z')

describe('formatReadMonth', () => {
  it('names every month without shifting it', () => {
    MONTH_NAMES.forEach((name, i) => {
      const mm = String(i + 1).padStart(2, '0')
      expect(formatReadMonth(`2026-${mm}`)).toBe(`${name} 2026`)
    })
    expect(formatReadMonth('2026-01')).toBe('January 2026')
    expect(formatReadMonth('2026-12')).toBe('December 2026')
  })
})

describe('splitReadMonth', () => {
  it('splits a stored month and treats null as empty', () => {
    expect(splitReadMonth('2026-09')).toEqual({ month: '09', year: '2026' })
    expect(splitReadMonth(null)).toEqual({ month: '', year: '' })
  })
})

describe('readMonthFromParts', () => {
  it('joins a month and year', () => {
    expect(readMonthFromParts('09', '2026', now)).toEqual({ readMonth: '2026-09' })
  })

  it('treats both empty as clear', () => {
    expect(readMonthFromParts('', '', now)).toEqual({ readMonth: '' })
  })

  it('needs both parts', () => {
    expect(readMonthFromParts('09', '', now)).toEqual({ error: 'Choose both a month and a year' })
    expect(readMonthFromParts('', '2026', now)).toEqual({ error: 'Choose both a month and a year' })
  })

  it('rejects values outside the allowed range', () => {
    expect(readMonthFromParts('13', '2026', now)).toEqual({ error: 'Choose a month and year between 2000 and 2027' })
    expect(readMonthFromParts('01', '1999', now)).toEqual({ error: 'Choose a month and year between 2000 and 2027' })
  })
})

describe('readMonthYears', () => {
  it('runs from next year down to 2000', () => {
    const years = readMonthYears(now)
    expect(years[0]).toBe(2027)
    expect(years[years.length - 1]).toBe(2000)
    expect(years).toHaveLength(28)
  })
})
