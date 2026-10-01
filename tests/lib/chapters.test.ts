import { describe, it, expect } from 'vitest'
import {
  chapterRangeName,
  sectionDisplayName,
  validateChapterRange,
  validateTotalChapters,
  clampProgress,
  segmentStates,
} from '@/lib/chapters'

describe('chapterRangeName', () => {
  it('names a range', () => {
    expect(chapterRangeName(6, 10)).toBe('Chapters 6 to 10')
  })

  it('names a single-chapter thread in the singular', () => {
    expect(chapterRangeName(7, 7)).toBe('Chapter 7')
  })
})

describe('sectionDisplayName', () => {
  it('appends the title when there is one', () => {
    expect(sectionDisplayName({ startChapter: 6, endChapter: 10, title: 'Lowood' })).toBe('Chapters 6 to 10 · Lowood')
  })

  it('is just the range with no title, or a blank one', () => {
    expect(sectionDisplayName({ startChapter: 6, endChapter: 10, title: null })).toBe('Chapters 6 to 10')
    expect(sectionDisplayName({ startChapter: 6, endChapter: 10, title: '   ' })).toBe('Chapters 6 to 10')
  })
})

describe('validateChapterRange', () => {
  const total = 38

  it('accepts a valid range, including a single chapter and the very last chapter', () => {
    expect(validateChapterRange({ startChapter: 6, endChapter: 10, totalChapters: total })).toBeNull()
    expect(validateChapterRange({ startChapter: 7, endChapter: 7, totalChapters: total })).toBeNull()
    expect(validateChapterRange({ startChapter: 31, endChapter: 38, totalChapters: total })).toBeNull()
  })

  it('rejects a start below 1 or not a whole number', () => {
    expect(validateChapterRange({ startChapter: 0, endChapter: 5, totalChapters: total })).toBe(
      'Start chapter must be a whole number of at least 1'
    )
    expect(validateChapterRange({ startChapter: 1.5, endChapter: 5, totalChapters: total })).toBe(
      'Start chapter must be a whole number of at least 1'
    )
    expect(validateChapterRange({ startChapter: NaN, endChapter: 5, totalChapters: total })).toBe(
      'Start chapter must be a whole number of at least 1'
    )
  })

  it('rejects an end that is not a whole number', () => {
    expect(validateChapterRange({ startChapter: 1, endChapter: NaN, totalChapters: total })).toBe(
      'End chapter must be a whole number'
    )
  })

  it('rejects an end before the start', () => {
    expect(validateChapterRange({ startChapter: 10, endChapter: 6, totalChapters: total })).toBe(
      'End chapter cannot be before the start chapter'
    )
  })

  it('rejects an end past the total', () => {
    expect(validateChapterRange({ startChapter: 31, endChapter: 39, totalChapters: total })).toBe(
      "End chapter cannot be past the book's 38 chapters"
    )
  })
})

describe('validateTotalChapters', () => {
  it('accepts a whole number of at least 1', () => {
    expect(validateTotalChapters(1)).toBeNull()
    expect(validateTotalChapters(38)).toBeNull()
  })

  it('rejects zero, negatives, fractions and NaN', () => {
    const message = 'Total chapters must be a whole number of at least 1'
    expect(validateTotalChapters(0)).toBe(message)
    expect(validateTotalChapters(-4)).toBe(message)
    expect(validateTotalChapters(2.5)).toBe(message)
    expect(validateTotalChapters(NaN)).toBe(message)
  })
})

describe('clampProgress', () => {
  it('keeps an in-range whole number', () => {
    expect(clampProgress(12, 38)).toBe(12)
  })

  it('clamps below 0 and above the total', () => {
    expect(clampProgress(-3, 38)).toBe(0)
    expect(clampProgress(99, 38)).toBe(38)
  })

  it('floors fractions and turns NaN into 0', () => {
    expect(clampProgress(2.7, 38)).toBe(2)
    expect(clampProgress(NaN, 38)).toBe(0)
  })
})

describe('segmentStates', () => {
  const sections = [
    { startChapter: 1, endChapter: 5 },
    { startChapter: 6, endChapter: 10 },
    { startChapter: 11, endChapter: 15 },
    { startChapter: 16, endChapter: 20 },
  ]

  it('marks finished threads done, the one in progress current, the rest todo', () => {
    expect(segmentStates(sections, 12)).toEqual(['done', 'done', 'current', 'todo'])
  })

  it('has no current segment when the reader is exactly between threads', () => {
    expect(segmentStates(sections, 10)).toEqual(['done', 'done', 'todo', 'todo'])
  })

  it('is all todo at 0 and all done at the end', () => {
    expect(segmentStates(sections, 0)).toEqual(['todo', 'todo', 'todo', 'todo'])
    expect(segmentStates(sections, 20)).toEqual(['done', 'done', 'done', 'done'])
  })

  it('treats a one-chapter thread as done once finished, and never current', () => {
    const single = [{ startChapter: 7, endChapter: 7 }]
    expect(segmentStates(single, 6)).toEqual(['todo'])
    expect(segmentStates(single, 7)).toEqual(['done'])
  })
})
