const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u

/** First and last name initials, e.g. "Mary Jane Watson" -> "MW". "?" if there is no usable name. */
export function getInitials(name: string | null | undefined): string {
  const initials = (name ?? '')
    .split(/\s+/)
    .map((word) => word.match(LETTER_OR_DIGIT)?.[0])
    .filter((char): char is string => Boolean(char))

  if (initials.length === 0) return '?'
  const picked = initials.length === 1 ? initials[0] : initials[0] + initials[initials.length - 1]
  return picked.toUpperCase()
}

/** Deterministically maps an id to an index in [0, count), so a person keeps the same color. */
export function avatarColorIndex(id: string, count: number): number {
  let hash = 0
  for (const char of id) {
    hash = (hash * 31 + char.codePointAt(0)!) >>> 0
  }
  return hash % count
}
