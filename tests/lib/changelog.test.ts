import { describe, it, expect } from 'vitest'
import { CHANGELOG, compareVersions, isNewerThan, latestVersion } from '@/lib/changelog'

describe('changelog', () => {
  it('compares versions numerically per part', () => {
    expect(compareVersions('1.10', '1.9')).toBeGreaterThan(0)
    expect(compareVersions('1.2', '1.2')).toBe(0)
    expect(compareVersions('1.2', '2.0')).toBeLessThan(0)
  })

  it('treats a missing last-seen version as everything being new', () => {
    expect(isNewerThan('1.3', null)).toBe(true)
    expect(isNewerThan('1.3', '1.3')).toBe(false)
    expect(isNewerThan('1.4', '1.3')).toBe(true)
  })

  it('is sorted newest first', () => {
    for (let i = 1; i < CHANGELOG.length; i++) {
      expect(compareVersions(CHANGELOG[i - 1].version, CHANGELOG[i].version)).toBeGreaterThan(0)
    }
    expect(latestVersion()).toBe(CHANGELOG[0].version)
  })

  it('uses well-formed versions and dates', () => {
    for (const entry of CHANGELOG) {
      expect(entry.version).toMatch(/^\d+\.\d+$/)
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })
})
