export const CLUB_NAME_MAX = 60
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
