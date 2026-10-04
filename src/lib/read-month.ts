import { READ_MONTH_MIN_YEAR, validateReadMonth } from '@/lib/limits'

// Hard-coded so the label never depends on the server's locale or timezone.
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const

// "2026-09" -> "September 2026"
export function formatReadMonth(readMonth: string): string {
  const [year, month] = readMonth.split('-')
  return `${MONTH_NAMES[Number(month) - 1]} ${year}`
}

export function splitReadMonth(readMonth: string | null): { month: string; year: string } {
  if (!readMonth) return { month: '', year: '' }
  const [year, month] = readMonth.split('-')
  return { month, year }
}

// The admin editor posts a month and a year separately. Both empty means clear.
export function readMonthFromParts(
  month: string,
  year: string,
  now: Date = new Date()
): { readMonth: string } | { error: string } {
  if (month === '' && year === '') return { readMonth: '' }
  if (month === '' || year === '') return { error: 'Choose both a month and a year' }
  const readMonth = `${year}-${month}`
  const problem = validateReadMonth(readMonth, now)
  return problem ? { error: problem } : { readMonth }
}

// Newest first, for the year dropdown.
export function readMonthYears(now: Date = new Date()): number[] {
  const years: number[] = []
  for (let year = now.getFullYear() + 1; year >= READ_MONTH_MIN_YEAR; year--) years.push(year)
  return years
}
