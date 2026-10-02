import { describe, it, expect } from 'vitest'
import { appendStarter, computeTextareaHeight } from '@/lib/composer'

// A 24px line with 16px of padding and 2px of border.
const base = { lineHeight: 24, paddingSpace: 16, borderSpace: 2, maxLines: 6 }

describe('computeTextareaHeight', () => {
  it('fits one line without scrolling', () => {
    expect(computeTextareaHeight({ ...base, scrollHeight: 40 })).toEqual({ height: 42, scroll: false })
  })

  it('grows with the content up to exactly six lines', () => {
    expect(computeTextareaHeight({ ...base, scrollHeight: 16 + 24 * 6 })).toEqual({ height: 162, scroll: false })
  })

  it('stops at six lines and scrolls beyond that', () => {
    expect(computeTextareaHeight({ ...base, scrollHeight: 16 + 24 * 7 })).toEqual({ height: 162, scroll: true })
    expect(computeTextareaHeight({ ...base, scrollHeight: 16 + 24 * 40 })).toEqual({ height: 162, scroll: true })
  })
})

describe('appendStarter', () => {
  it('fills an empty or whitespace-only box with the prompt', () => {
    expect(appendStarter('', 'Who is your favorite?')).toBe('Who is your favorite?')
    expect(appendStarter('  \n ', 'Who is your favorite?')).toBe('Who is your favorite?')
  })

  it('appends to existing text on a new line instead of overwriting it', () => {
    expect(appendStarter('My thoughts so far.', 'Who is your favorite?')).toBe(
      'My thoughts so far.\nWho is your favorite?'
    )
    expect(appendStarter('Trailing space \n', 'Q?')).toBe('Trailing space\nQ?')
  })
})
