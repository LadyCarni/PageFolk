export function chapterRangeName(start: number, end: number): string {
  return start === end ? `Chapter ${start}` : `Chapters ${start} to ${end}`
}

export function sectionDisplayName(s: {
  startChapter: number
  endChapter: number
  title: string | null
}): string {
  const range = chapterRangeName(s.startChapter, s.endChapter)
  const title = s.title?.trim()
  return title ? `${range} · ${title}` : range
}

export function validateChapterRange(input: {
  startChapter: number
  endChapter: number
  totalChapters: number
}): string | null {
  const { startChapter, endChapter, totalChapters } = input
  if (!Number.isInteger(startChapter) || startChapter < 1) {
    return 'Start chapter must be a whole number of at least 1'
  }
  if (!Number.isInteger(endChapter)) {
    return 'End chapter must be a whole number'
  }
  if (endChapter < startChapter) {
    return 'End chapter cannot be before the start chapter'
  }
  if (endChapter > totalChapters) {
    return `End chapter cannot be past the book's ${totalChapters} chapters`
  }
  return null
}

export function validateNoOverlap(
  existing: { id: string; startChapter: number; endChapter: number; title: string | null }[],
  range: { startChapter: number; endChapter: number },
  ignoreId?: string
): string | null {
  const clash = existing.find(
    (s) => s.id !== ignoreId && range.startChapter <= s.endChapter && s.startChapter <= range.endChapter
  )
  if (!clash) return null
  return `${chapterRangeName(range.startChapter, range.endChapter)} overlaps ${sectionDisplayName(clash)}`
}

export function validateTotalChapters(total: number): string | null {
  return Number.isInteger(total) && total >= 1 ? null : 'Total chapters must be a whole number of at least 1'
}

// An empty or non-numeric field becomes NaN, which the validators reject with a message.
export function parseWholeNumber(raw: string | null | undefined | File): number {
  const text = typeof raw === 'string' ? raw.trim() : ''
  return text === '' ? NaN : Number(text)
}

type OtherSection = { id: string; startChapter: number; endChapter: number; title: string | null }

// What a form needs to know to check its own values, as plain data a server page can pass down.
export type FormRule =
  | { kind: 'section'; totalChapters: number; others: OtherSection[]; ignoreId?: string }
  | { kind: 'total'; minTotal: number }
  | { kind: 'newBook' }

// The same checks the server runs, so a form can disable Save before a round trip.
export function validateFormValues(rule: FormRule, values: Record<string, string>): string | null {
  if (rule.kind === 'section') {
    const range = {
      startChapter: parseWholeNumber(values.startChapter),
      endChapter: parseWholeNumber(values.endChapter),
    }
    return (
      validateChapterRange({ ...range, totalChapters: rule.totalChapters }) ??
      validateNoOverlap(rule.others, range, rule.ignoreId)
    )
  }

  if (rule.kind === 'total') {
    const total = parseWholeNumber(values.totalChapters)
    return (
      validateTotalChapters(total) ??
      (total < rule.minTotal ? `Total chapters cannot be less than ${rule.minTotal}, where the last thread ends` : null)
    )
  }

  if (!values.title?.trim() || !values.author?.trim()) {
    return 'Title and author are required'
  }
  return validateTotalChapters(parseWholeNumber(values.totalChapters))
}

export function clampProgress(value: number, total: number): number {
  if (Number.isNaN(value)) return 0
  return Math.min(Math.max(Math.floor(value), 0), total)
}

export type SegmentState = 'done' | 'current' | 'todo'

export function segmentStates(
  sections: { startChapter: number; endChapter: number }[],
  finished: number
): SegmentState[] {
  return sections.map((s) => {
    if (finished >= s.endChapter) return 'done'
    if (finished >= s.startChapter) return 'current'
    return 'todo'
  })
}
