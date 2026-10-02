import { describe, it, expect } from 'vitest'
import { pickAdminBook } from '@/lib/admin-view'

// Newest first, as listBooks() returns them.
const books = [
  { id: 'past-new', status: 'past' },
  { id: 'current', status: 'current' },
  { id: 'past-old', status: 'past' },
]

describe('pickAdminBook', () => {
  it('picks the requested book and marks the choice explicit', () => {
    expect(pickAdminBook(books, 'past-old')).toEqual({ book: books[2], explicit: true })
  })

  it('falls back to the first current book for no request or an unknown ID', () => {
    expect(pickAdminBook(books)).toEqual({ book: books[1], explicit: false })
    expect(pickAdminBook(books, 'deleted-id')).toEqual({ book: books[1], explicit: false })
  })

  it('falls back to the newest book when none is current', () => {
    const allPast = [books[0], books[2]]
    expect(pickAdminBook(allPast, 'nope')).toEqual({ book: books[0], explicit: false })
  })

  it('is null when there are no books', () => {
    expect(pickAdminBook([], 'anything')).toEqual({ book: null, explicit: false })
  })
})
