import { describe, it, expect } from 'vitest'
import { parseChapterLabel, planBackfill } from '../../scripts/migrate-sections.mjs'

describe('parseChapterLabel', () => {
  it('reads the labels used in the app today', () => {
    expect(parseChapterLabel('Chapters 1-10')).toEqual({ startChapter: 1, endChapter: 10 })
    expect(parseChapterLabel('Chapters 61-75')).toEqual({ startChapter: 61, endChapter: 75 })
  })

  it('tolerates spacing, case, abbreviations, en dashes and "to"', () => {
    expect(parseChapterLabel('  chapters 6 – 10 ')).toEqual({ startChapter: 6, endChapter: 10 })
    expect(parseChapterLabel('Ch 1-5')).toEqual({ startChapter: 1, endChapter: 5 })
    expect(parseChapterLabel('Ch. 1-5')).toEqual({ startChapter: 1, endChapter: 5 })
    expect(parseChapterLabel('Chapters 6 to 10')).toEqual({ startChapter: 6, endChapter: 10 })
  })

  it('reads a single chapter', () => {
    expect(parseChapterLabel('Chapter 7')).toEqual({ startChapter: 7, endChapter: 7 })
  })

  it('returns null for labels it cannot read or that are backwards or start at 0', () => {
    expect(parseChapterLabel('The Gathering')).toBeNull()
    expect(parseChapterLabel('Chapters 10-6')).toBeNull()
    expect(parseChapterLabel('Chapters 0-5')).toBeNull()
    expect(parseChapterLabel('')).toBeNull()
  })
})

describe('planBackfill', () => {
  it('plans an update per section and the highest end chapter per book', () => {
    const plan = planBackfill([
      { id: 's1', bookId: 'b1', label: 'Chapters 1-10' },
      { id: 's2', bookId: 'b1', label: 'Chapters 11-20' },
      { id: 's3', bookId: 'b2', label: 'Chapters 1-5' },
    ])
    expect(plan.errors).toEqual([])
    expect(plan.updates).toEqual([
      { id: 's1', startChapter: 1, endChapter: 10 },
      { id: 's2', startChapter: 11, endChapter: 20 },
      { id: 's3', startChapter: 1, endChapter: 5 },
    ])
    expect(plan.totals).toEqual({ b1: 20, b2: 5 })
  })

  it('reports every unreadable label with its section id and the label text', () => {
    const plan = planBackfill([
      { id: 's1', bookId: 'b1', label: 'Chapters 1-10' },
      { id: 's2', bookId: 'b1', label: 'The Gathering' },
      { id: 's3', bookId: 'b1', label: 'Epilogue' },
    ])
    expect(plan.errors).toHaveLength(2)
    expect(plan.errors[0]).toContain('s2')
    expect(plan.errors[0]).toContain('The Gathering')
    expect(plan.errors[1]).toContain('Epilogue')
  })
})
