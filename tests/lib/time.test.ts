import { describe, it, expect } from 'vitest'
import { formatRelativeTime } from '@/lib/time'

const NOW = new Date('2026-09-30T12:00:00Z')
const ago = (ms: number) => new Date(NOW.getTime() - ms)
const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

describe('formatRelativeTime', () => {
  it('says now for under a minute, including slightly-future clock skew', () => {
    expect(formatRelativeTime(ago(0), NOW)).toBe('now')
    expect(formatRelativeTime(ago(59_000), NOW)).toBe('now')
    expect(formatRelativeTime(ago(-5_000), NOW)).toBe('now')
  })

  it('uses minutes under an hour', () => {
    expect(formatRelativeTime(ago(MIN), NOW)).toBe('1min')
    expect(formatRelativeTime(ago(23 * MIN + 30_000), NOW)).toBe('23min')
    expect(formatRelativeTime(ago(59 * MIN), NOW)).toBe('59min')
  })

  it('uses hours under a day', () => {
    expect(formatRelativeTime(ago(HOUR), NOW)).toBe('1h')
    expect(formatRelativeTime(ago(23 * HOUR + 59 * MIN), NOW)).toBe('23h')
  })

  it('uses days under a week', () => {
    expect(formatRelativeTime(ago(DAY), NOW)).toBe('1d')
    expect(formatRelativeTime(ago(6 * DAY), NOW)).toBe('6d')
  })

  it('uses weeks under a month', () => {
    expect(formatRelativeTime(ago(7 * DAY), NOW)).toBe('1w')
    expect(formatRelativeTime(ago(28 * DAY), NOW)).toBe('4w')
    expect(formatRelativeTime(ago(29 * DAY), NOW)).toBe('4w')
  })

  it('uses months under a year', () => {
    expect(formatRelativeTime(ago(30 * DAY), NOW)).toBe('1m')
    expect(formatRelativeTime(ago(150 * DAY), NOW)).toBe('5m')
    expect(formatRelativeTime(ago(364 * DAY), NOW)).toBe('12m')
  })

  it('uses years after that', () => {
    expect(formatRelativeTime(ago(365 * DAY), NOW)).toBe('1y')
    expect(formatRelativeTime(ago(2 * 365 * DAY + 10 * DAY), NOW)).toBe('2y')
  })
})
