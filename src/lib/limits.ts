export const CLUB_NAME_MAX = 40
export const BLURB_MAX = 1000

export function validateClubName(name: string): string | null {
  const trimmed = name.trim()
  if (!trimmed) return 'Club name is required'
  if (trimmed.length > CLUB_NAME_MAX) return `Club name must be ${CLUB_NAME_MAX} characters or fewer`
  return null
}

// An empty (or whitespace-only) blurb is valid: saving it clears the blurb.
export function validateBlurb(text: string): string | null {
  return text.trim().length > BLURB_MAX ? `Blurb must be ${BLURB_MAX} characters or fewer` : null
}

export const CHAPTER_NAME_MAX = 100

// Counted after trimming; a blank name is valid and means the chapter has no name.
export function validateChapterName(name: string): string | null {
  return name.trim().length > CHAPTER_NAME_MAX ? `Chapter names can be at most ${CHAPTER_NAME_MAX} characters` : null
}

export const READ_MONTH_MIN_YEAR = 2000

// "YYYY-MM" from 2000 to next year. Empty is valid: saving it clears the month.
export function validateReadMonth(input: string, now: Date = new Date()): string | null {
  if (input === '') return null
  const maxYear = now.getFullYear() + 1
  const message = `Choose a month and year between ${READ_MONTH_MIN_YEAR} and ${maxYear}`
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(input)
  if (!match) return message
  const year = Number(match[1])
  return year < READ_MONTH_MIN_YEAR || year > maxYear ? message : null
}
