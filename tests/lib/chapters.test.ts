import { describe, it, expect } from 'vitest'
import {
  chapterRangeName,
  sectionDisplayName,
  validateChapterRange,
  validateTotalChapters,
  validateNoOverlap,
  parseWholeNumber,
  validateFormValues,
  clampProgress,
  segmentStates,
  chapterCoverage,
  formatGaps,
  coverageSummary,
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

describe('validateNoOverlap', () => {
  const existing = [
    { id: 'a', startChapter: 1, endChapter: 10, title: null },
    { id: 'b', startChapter: 11, endChapter: 20, title: 'Lowood' },
  ]

  it('accepts a range that sits in a gap or is adjacent to others', () => {
    expect(validateNoOverlap(existing, { startChapter: 21, endChapter: 25 })).toBeNull()
    expect(validateNoOverlap([existing[0]], { startChapter: 11, endChapter: 20 })).toBeNull()
  })

  it('rejects a range that shares a chapter with another thread, naming it', () => {
    expect(validateNoOverlap(existing, { startChapter: 1, endChapter: 12 }, 'a')).toBe(
      'Chapters 1 to 12 overlaps Chapters 11 to 20 · Lowood'
    )
    expect(validateNoOverlap(existing, { startChapter: 9, endChapter: 11 })).toContain('overlaps')
  })

  it('rejects a single chapter inside another thread, and a range that swallows one', () => {
    expect(validateNoOverlap(existing, { startChapter: 5, endChapter: 5 })).toContain('overlaps')
    expect(validateNoOverlap(existing, { startChapter: 3, endChapter: 25 })).toContain('overlaps')
  })

  it('ignores the thread being edited', () => {
    expect(validateNoOverlap(existing, { startChapter: 1, endChapter: 10 }, 'a')).toBeNull()
    expect(validateNoOverlap(existing, { startChapter: 2, endChapter: 9 }, 'a')).toBeNull()
  })
})

describe('parseWholeNumber', () => {
  it('parses digits, trimming spaces', () => {
    expect(parseWholeNumber('12')).toBe(12)
    expect(parseWholeNumber(' 7 ')).toBe(7)
  })

  it('turns blank, missing and non-numeric input into NaN (so validators reject it)', () => {
    expect(parseWholeNumber('')).toBeNaN()
    expect(parseWholeNumber('   ')).toBeNaN()
    expect(parseWholeNumber(null)).toBeNaN()
    expect(parseWholeNumber('abc')).toBeNaN()
  })

  it('keeps fractions so the validators can reject them', () => {
    expect(parseWholeNumber('2.5')).toBe(2.5)
  })
})

describe('validateFormValues', () => {
  const others = [
    { id: 'a', startChapter: 1, endChapter: 10, title: null },
    { id: 'b', startChapter: 11, endChapter: 20, title: 'Lowood' },
  ]

  describe('section rule', () => {
    const rule = { kind: 'section' as const, totalChapters: 30, others, ignoreId: 'a' }

    it('accepts an edit that stays in its own space', () => {
      expect(validateFormValues(rule, { startChapter: '1', endChapter: '9', title: 'x' })).toBeNull()
    })

    it('rejects blank, backwards and past-the-total values', () => {
      expect(validateFormValues(rule, { startChapter: '', endChapter: '9' })).toContain('Start chapter')
      expect(validateFormValues(rule, { startChapter: '9', endChapter: '2' })).toContain('before the start')
      expect(validateFormValues(rule, { startChapter: '1', endChapter: '31' })).toContain('past the book')
    })

    it('rejects an edit that runs into another thread', () => {
      expect(validateFormValues(rule, { startChapter: '1', endChapter: '12' })).toBe(
        'Chapters 1 to 12 overlaps Chapters 11 to 20 · Lowood'
      )
    })

    it('treats every thread as a clash when adding a new one (no ignoreId)', () => {
      const adding = { kind: 'section' as const, totalChapters: 30, others }
      expect(validateFormValues(adding, { startChapter: '5', endChapter: '8' })).toContain('overlaps')
      expect(validateFormValues(adding, { startChapter: '21', endChapter: '25' })).toBeNull()
    })
  })

  describe('total rule', () => {
    const rule = { kind: 'total' as const, minTotal: 30 }

    it('accepts a total at or above where the last thread ends', () => {
      expect(validateFormValues(rule, { totalChapters: '30' })).toBeNull()
      expect(validateFormValues(rule, { totalChapters: '40' })).toBeNull()
    })

    it('rejects a total below where the last thread ends, with the same message as the server', () => {
      expect(validateFormValues(rule, { totalChapters: '25' })).toBe(
        'Total chapters cannot be less than 30, where the last thread ends'
      )
    })

    it('rejects blank, zero and fractional totals', () => {
      expect(validateFormValues({ kind: 'total', minTotal: 0 }, { totalChapters: '' })).toContain('Total chapters')
      expect(validateFormValues({ kind: 'total', minTotal: 0 }, { totalChapters: '0' })).toContain('Total chapters')
      expect(validateFormValues({ kind: 'total', minTotal: 0 }, { totalChapters: '2.5' })).toContain('Total chapters')
    })
  })

  describe('new book rule', () => {
    const rule = { kind: 'newBook' as const }

    it('requires a title and author, and a valid total', () => {
      expect(validateFormValues(rule, { title: ' ', author: 'A', totalChapters: '10' })).toBe(
        'Title and author are required'
      )
      expect(validateFormValues(rule, { title: 'T', author: '', totalChapters: '10' })).toBe(
        'Title and author are required'
      )
      expect(validateFormValues(rule, { title: 'T', author: 'A', totalChapters: '0' })).toContain('Total chapters')
      expect(validateFormValues(rule, { title: 'T', author: 'A', totalChapters: '10' })).toBeNull()
    })
  })
})

describe('validateFormValues: club name and blurb rules', () => {
  it('checks the club name', () => {
    expect(validateFormValues({ kind: 'clubName' }, { clubName: 'The Thursday Readers' })).toBeNull()
    expect(validateFormValues({ kind: 'clubName' }, { clubName: '   ' })).toBe('Club name is required')
    expect(validateFormValues({ kind: 'clubName' }, { clubName: 'a'.repeat(41) })).toBe(
      'Club name must be 40 characters or fewer'
    )
    expect(validateFormValues({ kind: 'clubName' }, {})).toBe('Club name is required')
  })

  it('checks the blurb, allowing it to be empty', () => {
    expect(validateFormValues({ kind: 'blurb' }, { blurb: '' })).toBeNull()
    expect(validateFormValues({ kind: 'blurb' }, {})).toBeNull()
    expect(validateFormValues({ kind: 'blurb' }, { blurb: 'a'.repeat(1001) })).toBe(
      'Blurb must be 1000 characters or fewer'
    )
  })
})

describe('chapterCoverage', () => {
  it('is one uncovered segment when there are no sections', () => {
    expect(chapterCoverage(38, [])).toEqual({
      covered: 0,
      total: 38,
      complete: false,
      gaps: [{ start: 1, end: 38 }],
      segments: [{ start: 1, end: 38, covered: false }],
    })
  })

  it('is complete with no gaps when sections cover every chapter', () => {
    const c = chapterCoverage(10, [
      { startChapter: 1, endChapter: 4 },
      { startChapter: 5, endChapter: 10 },
    ])
    expect(c.complete).toBe(true)
    expect(c.covered).toBe(10)
    expect(c.gaps).toEqual([])
    expect(c.segments).toEqual([
      { start: 1, end: 4, covered: true },
      { start: 5, end: 10, covered: true },
    ])
  })

  it('finds a gap at the end, as in the concept', () => {
    const c = chapterCoverage(38, [
      { startChapter: 1, endChapter: 5 },
      { startChapter: 6, endChapter: 10 },
      { startChapter: 11, endChapter: 15 },
    ])
    expect(c.covered).toBe(15)
    expect(c.complete).toBe(false)
    expect(c.gaps).toEqual([{ start: 16, end: 38 }])
    expect(c.segments.at(-1)).toEqual({ start: 16, end: 38, covered: false })
  })

  it('finds gaps at the start and in the middle, whatever order sections arrive in', () => {
    const c = chapterCoverage(20, [
      { startChapter: 12, endChapter: 20 },
      { startChapter: 3, endChapter: 8 },
    ])
    expect(c.gaps).toEqual([
      { start: 1, end: 2 },
      { start: 9, end: 11 },
    ])
    expect(c.segments).toEqual([
      { start: 1, end: 2, covered: false },
      { start: 3, end: 8, covered: true },
      { start: 9, end: 11, covered: false },
      { start: 12, end: 20, covered: true },
    ])
    expect(c.covered).toBe(15)
  })

  it('counts single-chapter sections and single-chapter gaps', () => {
    const c = chapterCoverage(3, [
      { startChapter: 1, endChapter: 1 },
      { startChapter: 3, endChapter: 3 },
    ])
    expect(c.covered).toBe(2)
    expect(c.gaps).toEqual([{ start: 2, end: 2 }])
  })
})

describe('formatGaps', () => {
  it('is empty with no gaps', () => {
    expect(formatGaps([])).toBe('')
  })

  it('names one range, or one chapter in the singular', () => {
    expect(formatGaps([{ start: 16, end: 38 }])).toBe('chapters 16 to 38')
    expect(formatGaps([{ start: 4, end: 4 }])).toBe('chapter 4')
  })

  it('joins two gaps with "and" and more with commas', () => {
    expect(formatGaps([{ start: 4, end: 4 }, { start: 9, end: 12 }])).toBe('chapters 4 and 9 to 12')
    expect(
      formatGaps([
        { start: 4, end: 4 },
        { start: 9, end: 12 },
        { start: 30, end: 38 },
      ])
    ).toBe('chapters 4, 9 to 12 and 30 to 38')
  })
})

describe('coverageSummary', () => {
  it('says there are no sections yet', () => {
    expect(coverageSummary(chapterCoverage(38, []))).toEqual({ lead: 'No sections yet.', rest: '' })
  })

  it('counts covered chapters and lists what is missing', () => {
    const c = chapterCoverage(38, [{ startChapter: 1, endChapter: 15 }])
    expect(coverageSummary(c)).toEqual({
      lead: '15 of 38 chapters are in a section.',
      rest: 'Not yet covered: chapters 16 to 38.',
    })
  })

  it('uses "is" for a single covered chapter', () => {
    const c = chapterCoverage(5, [{ startChapter: 2, endChapter: 2 }])
    expect(coverageSummary(c).lead).toBe('1 of 5 chapters is in a section.')
  })

  it('says everything is covered when complete', () => {
    expect(coverageSummary(chapterCoverage(38, [{ startChapter: 1, endChapter: 38 }]))).toEqual({
      lead: 'All 38 chapters are in a section.',
      rest: '',
    })
    expect(coverageSummary(chapterCoverage(1, [{ startChapter: 1, endChapter: 1 }])).lead).toBe(
      'The one chapter is in a section.'
    )
  })
})
