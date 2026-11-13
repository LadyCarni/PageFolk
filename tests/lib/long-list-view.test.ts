import { describe, it, expect } from 'vitest'
import {
  duplicateKey,
  filteredSummary,
  genresOnList,
  likeLabel,
  longListPath,
  longListSummary,
  longListTarget,
  parseGenre,
  parseSort,
  sortLongList,
} from '@/lib/long-list-view'

describe('parseSort', () => {
  it('accepts known sorts and falls back to votes', () => {
    expect(parseSort('newest')).toBe('newest')
    expect(parseSort('az')).toBe('az')
    expect(parseSort(undefined)).toBe('votes')
    expect(parseSort('bogus')).toBe('votes')
    expect(parseSort(['az'])).toBe('votes')
  })
})

describe('duplicateKey', () => {
  it('ignores case, outer whitespace and repeated spaces', () => {
    expect(duplicateKey('  the  REMAINS of the day ', ' Kazuo   Ishiguro')).toBe(
      duplicateKey('The Remains of the Day', 'kazuo ishiguro'),
    )
    expect(duplicateKey('The Remains of the Day', 'Kazuo Ishiguro')).not.toBe(
      duplicateKey('The Remains of the Day', 'Someone Else'),
    )
  })
})

describe('sortLongList', () => {
  const day = (n: number) => new Date(2026, 0, n)
  const books = [
    { title: 'A', votes: 2, createdAt: day(1) },
    { title: 'B', votes: 2, createdAt: day(3) },
    { title: 'C', votes: 5, createdAt: day(2) },
  ]

  it('sorts by votes then newest', () => {
    expect(sortLongList(books, 'votes').map((b) => b.title)).toEqual(['C', 'B', 'A'])
  })

  it('sorts newest first', () => {
    expect(sortLongList(books, 'newest').map((b) => b.title)).toEqual(['B', 'C', 'A'])
  })

  it('sorts A-Z ignoring a leading The, A or An', () => {
    const titled = ['The Zebra', 'an apple', 'Banana'].map((title) => ({ title, votes: 0, createdAt: day(1) }))
    expect(sortLongList(titled, 'az').map((b) => b.title)).toEqual(['an apple', 'Banana', 'The Zebra'])
  })

  it('does not mutate the input', () => {
    const copy = [...books]
    sortLongList(books, 'votes')
    expect(books).toEqual(copy)
  })
})

describe('labels', () => {
  it('summarises the list', () => {
    expect(longListSummary(0)).toBe('No books suggested yet')
    expect(longListSummary(1)).toBe('1 book suggested · like as many as you want')
    expect(longListSummary(12)).toBe('12 books suggested · like as many as you want')
  })

  it('labels votes', () => {
    expect(likeLabel(1)).toBe('1 like')
    expect(likeLabel(0)).toBe('0 likes')
  })
})

describe('longListTarget', () => {
  it('opens the panel on wide screens, keeping the sort', () => {
    expect(longListTarget('/long-list?book=abc', true, 'az')).toBe('/long-list?sort=az&book=abc')
  })
  it('goes to the book page on narrow screens', () => {
    expect(longListTarget('/long-list?book=abc', false, 'votes')).toBe('/long-list/abc')
  })
  it('leaves other hrefs alone', () => {
    expect(longListTarget('/shelf/xyz', false, 'votes')).toBe('/shelf/xyz')
    expect(longListTarget('/', true, 'newest')).toBe('/')
  })
})

describe('genre filter', () => {
  const books = [{ genre: 'Mystery' }, { genre: null }, { genre: 'Fantasy' }, { genre: 'Mystery' }]

  it('offers only the genres on the list, once each, alphabetically', () => {
    expect(genresOnList(books)).toEqual(['Fantasy', 'Mystery'])
    expect(genresOnList([{ genre: null }])).toEqual([])
  })

  it('accepts a genre only if the list has it', () => {
    expect(parseGenre('Fantasy', ['Fantasy', 'Mystery'])).toBe('Fantasy')
    expect(parseGenre('Horror', ['Fantasy', 'Mystery'])).toBeNull()
    expect(parseGenre(undefined, ['Fantasy'])).toBeNull()
    expect(parseGenre(['Fantasy'], ['Fantasy'])).toBeNull()
  })

  it('builds the list address with the sort, genre and book', () => {
    expect(longListPath({ sort: 'votes', genre: null })).toBe('/long-list?sort=votes')
    expect(longListPath({ sort: 'az', genre: 'Science Fiction' })).toBe('/long-list?sort=az&genre=Science+Fiction')
    expect(longListPath({ sort: 'newest', genre: 'Mystery', book: 'b1' })).toBe(
      '/long-list?sort=newest&genre=Mystery&book=b1',
    )
  })

  it('describes a filtered list', () => {
    expect(filteredSummary(3, 12, 'Fantasy')).toBe('3 Fantasy books · 12 suggested in all')
    expect(filteredSummary(1, 12, 'Mystery')).toBe('1 Mystery book · 12 suggested in all')
  })
})
