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

export function validateTotalChapters(total: number): string | null {
  return Number.isInteger(total) && total >= 1 ? null : 'Total chapters must be a whole number of at least 1'
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
