import { describe, it, expect } from 'vitest'
import { bookPath, pickDefaultThread, resolveSelectedThread, threadHref } from '@/lib/threads'
import type { SectionSummary } from '@/lib/sections'

const open = (id: string, order: number): SectionSummary => ({
  id,
  order,
  status: 'unlocked',
  startChapter: order * 5 - 4,
  endChapter: order * 5,
  title: null,
  postCount: 0,
  lastPostAt: null,
})
const sealed = (id: string, order: number): SectionSummary => ({
  id,
  order,
  status: 'locked',
  startChapter: order * 5 - 4,
  endChapter: order * 5,
  chaptersToGo: 3,
})

describe('pickDefaultThread', () => {
  it('picks the open thread with the highest order, wherever it sits in the list', () => {
    expect(pickDefaultThread([open('b', 2), open('a', 1), sealed('c', 3)])).toBe('b')
  })

  it('ignores sealed threads, even ones with a higher order', () => {
    expect(pickDefaultThread([open('a', 1), sealed('z', 9)])).toBe('a')
  })

  it('returns null when nothing is open, or there are no threads', () => {
    expect(pickDefaultThread([sealed('a', 1)])).toBeNull()
    expect(pickDefaultThread([])).toBeNull()
  })
})

describe('resolveSelectedThread', () => {
  const sections = [open('a', 1), open('b', 2), sealed('c', 3)]

  it('selects a requested open thread and marks it explicit', () => {
    expect(resolveSelectedThread(sections, 'a')).toEqual({ selectedId: 'a', explicit: true })
  })

  it('treats a requested sealed thread as no selection, falling back to the default', () => {
    expect(resolveSelectedThread(sections, 'c')).toEqual({ selectedId: 'b', explicit: false })
  })

  it('treats unknown, empty and missing requests as no selection', () => {
    expect(resolveSelectedThread(sections, 'nope')).toEqual({ selectedId: 'b', explicit: false })
    expect(resolveSelectedThread(sections, '')).toEqual({ selectedId: 'b', explicit: false })
    expect(resolveSelectedThread(sections, undefined)).toEqual({ selectedId: 'b', explicit: false })
  })

  it('selects nothing when no thread is open', () => {
    expect(resolveSelectedThread([sealed('a', 1)], 'a')).toEqual({ selectedId: null, explicit: false })
  })
})

describe('bookPath and threadHref', () => {
  it('uses / for the current book and /shelf/ID for any other', () => {
    expect(bookPath('b1', 'b1')).toBe('/')
    expect(bookPath('b2', 'b1')).toBe('/shelf/b2')
    expect(bookPath('b2', null)).toBe('/shelf/b2')
  })

  it('builds thread links on the right base, encoding the id', () => {
    expect(threadHref('b1', 'b1', 's1')).toBe('/?thread=s1')
    expect(threadHref('b2', 'b1', 's1')).toBe('/shelf/b2?thread=s1')
    expect(threadHref('b2', 'b1', 'a b')).toBe('/shelf/b2?thread=a%20b')
  })
})
