import { describe, it, expect } from 'vitest'
import { conversationsSubline, orderShelf, pickShelfBook, plural, sealedLabel, shelfSummary, statusLabel } from '@/lib/shelf-view'

const at = (iso: string) => new Date(iso)

describe('orderShelf', () => {
  it('puts dated books first, newest month first, then undated books by date added', () => {
    const books = [
      { id: 'undated-old', readMonth: null, createdAt: at('2026-01-01') },
      { id: 'jul', readMonth: '2026-07', createdAt: at('2026-07-01') },
      { id: 'undated-new', readMonth: null, createdAt: at('2026-05-01') },
      { id: 'sep', readMonth: '2026-09', createdAt: at('2026-02-01') },
      { id: 'dec-2025', readMonth: '2025-12', createdAt: at('2026-08-01') },
    ]
    expect(orderShelf(books).map((b) => b.id)).toEqual(['sep', 'jul', 'dec-2025', 'undated-new', 'undated-old'])
  })

  it('breaks a tie on the same month by date added, newest first, without changing the input', () => {
    const books = [
      { id: 'older', readMonth: '2026-09', createdAt: at('2026-01-01') },
      { id: 'newer', readMonth: '2026-09', createdAt: at('2026-03-01') },
    ]
    expect(orderShelf(books).map((b) => b.id)).toEqual(['newer', 'older'])
    expect(books.map((b) => b.id)).toEqual(['older', 'newer'])
  })
})

describe('shelfSummary', () => {
  it('counts books and what you have read', () => {
    expect(shelfSummary(8, 3)).toBe('8 books finished together. You have read 3 of them.')
    expect(shelfSummary(8, 1)).toBe('8 books finished together. You have read 1 of them.')
    expect(shelfSummary(8, 0)).toBe("8 books finished together. You haven't finished any yet.")
  })

  it('reads naturally with a single book', () => {
    expect(shelfSummary(1, 1)).toBe('1 book finished together. You have read it.')
    expect(shelfSummary(1, 0)).toBe("1 book finished together. You haven't finished it yet.")
  })
})

describe('pickShelfBook', () => {
  const books = [{ id: 'a' }, { id: 'b' }]

  it('picks the requested book when it is on the shelf', () => {
    expect(pickShelfBook(books, 'b')).toBe('b')
  })

  it('falls back to the first book for a missing or unknown request', () => {
    expect(pickShelfBook(books, undefined)).toBe('a')
    expect(pickShelfBook(books, 'current-book-id')).toBe('a')
  })

  it('picks nothing on an empty shelf', () => {
    expect(pickShelfBook([], 'a')).toBeNull()
  })
})

describe('statusLabel and conversationsSubline', () => {
  it('describes a finished book', () => {
    const book = { read: true, finished: 27, totalChapters: 27 }
    expect(statusLabel(book)).toBe('You have read this')
    expect(conversationsSubline(book)).toBe('You have finished this book, so every thread is open.')
  })

  it('describes a book in progress', () => {
    const book = { read: false, finished: 12, totalChapters: 27 }
    expect(statusLabel(book)).toBe('12 of 27 chapters read')
    expect(conversationsSubline(book)).toBe('You have read 12 of 27 chapters.')
  })

  it('describes a book not started', () => {
    const book = { read: false, finished: 0, totalChapters: 27 }
    expect(statusLabel(book)).toBe('Not started')
    expect(conversationsSubline(book)).toBe("You haven't started this book.")
  })
})

describe('sealedLabel and plural', () => {
  it('says how far until a sealed thread opens', () => {
    expect(sealedLabel(6)).toBe('Sealed · 6 chapters to go')
    expect(sealedLabel(1)).toBe('Sealed · 1 chapter to go')
    expect(sealedLabel(0)).toBe('Sealed')
  })

  it('pluralises counts', () => {
    expect(plural(1, 'note')).toBe('1 note')
    expect(plural(0, 'note')).toBe('0 notes')
    expect(plural(37, 'note')).toBe('37 notes')
  })
})
