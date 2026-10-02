import { describe, it, expect } from 'vitest'
import { activeNavHref } from '@/lib/nav'

describe('activeNavHref', () => {
  it('maps each section of the app to its nav link', () => {
    expect(activeNavHref('/')).toBe('/')
    expect(activeNavHref('/shelf')).toBe('/shelf')
    expect(activeNavHref('/shelf/abc123')).toBe('/shelf')
    expect(activeNavHref('/members')).toBe('/members')
    expect(activeNavHref('/admin')).toBe('/admin')
    expect(activeNavHref('/admin/allowed-emails')).toBe('/admin')
  })

  it('does not match look-alike paths', () => {
    expect(activeNavHref('/shelfy')).toBeNull()
    expect(activeNavHref('/membership')).toBeNull()
    expect(activeNavHref('/sign-in')).toBeNull()
  })
})
