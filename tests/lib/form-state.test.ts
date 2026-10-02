import { describe, it, expect } from 'vitest'
import { toFormState } from '@/lib/form-state'

describe('toFormState', () => {
  it('keeps a server error', () => {
    expect(toFormState({ error: 'Title and author are required' })).toEqual({ error: 'Title and author are required' })
  })

  it('counts an empty result as saved', () => {
    expect(toFormState({})).toEqual({ saved: true })
  })

  // A server action that calls redirect() resolves to undefined on the client.
  it('counts a missing result, from a redirecting action, as saved', () => {
    expect(toFormState(undefined)).toEqual({ saved: true })
  })
})
