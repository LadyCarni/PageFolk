import { describe, it, expect } from 'vitest'
import { signInRedirectPath } from '@/lib/sign-in-redirect'

describe('signInRedirectPath', () => {
  it('defaults to the home page', () => {
    expect(signInRedirectPath(undefined)).toBe('/')
    expect(signInRedirectPath('')).toBe('/')
    expect(signInRedirectPath(['/shelf', '/members'])).toBe('/')
  })

  it('keeps the path, query and hash of an absolute callback URL', () => {
    expect(signInRedirectPath('https://bookclub.carynfarvour.design/')).toBe('/')
    expect(signInRedirectPath('https://bookclub.carynfarvour.design/shelf/abc?thread=t1#n2')).toBe(
      '/shelf/abc?thread=t1#n2',
    )
  })

  it('accepts a relative path', () => {
    expect(signInRedirectPath('/members')).toBe('/members')
  })

  it('never leaves the site', () => {
    expect(signInRedirectPath('https://evil.example/steal')).toBe('/steal')
    expect(signInRedirectPath('//evil.example/steal')).toBe('/steal')
    expect(signInRedirectPath('/\\evil.example')).toBe('/')
    expect(signInRedirectPath('javascript:alert(1)')).toBe('/')
  })

  it('does not send people back to the sign-in or auth pages', () => {
    expect(signInRedirectPath('https://bookclub.carynfarvour.design/sign-in')).toBe('/')
    expect(signInRedirectPath('/sign-in?callbackUrl=%2Fshelf')).toBe('/')
    expect(signInRedirectPath('/api/auth/signout')).toBe('/')
  })
})
