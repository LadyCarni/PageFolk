import { describe, it, expect } from 'vitest'
import { activeNavHref, bookshelfHref } from '@/lib/nav'

describe('activeNavHref', () => {
  it('maps each section of the app to its nav link', () => {
    expect(activeNavHref('/')).toBe('/')
    expect(activeNavHref('/shelf')).toBe('/shelf')
    expect(activeNavHref('/shelf/abc123')).toBe('/shelf')
    expect(activeNavHref('/members')).toBe('/members')
    expect(activeNavHref('/whats-new')).toBe('/whats-new')
    expect(activeNavHref('/admin')).toBe('/admin')
    expect(activeNavHref('/admin/allowed-emails')).toBe('/admin')
  })

  it('does not match look-alike paths', () => {
    expect(activeNavHref('/shelfy')).toBeNull()
    expect(activeNavHref('/membership')).toBeNull()
    expect(activeNavHref('/whats-newer')).toBeNull()
    expect(activeNavHref('/sign-in')).toBeNull()
  })
})

describe('Bookshelf menu', () => {
  it('owns the Long List pages', () => {
    expect(activeNavHref('/long-list')).toBe('/shelf')
    expect(activeNavHref('/long-list/x')).toBe('/shelf')
    expect(activeNavHref('/long-listing')).toBeNull()
  })

  it('says which menu item is the current page', () => {
    expect(bookshelfHref('/shelf/abc')).toBe('/shelf')
    expect(bookshelfHref('/long-list')).toBe('/long-list')
    expect(bookshelfHref('/members')).toBeNull()
  })
})
