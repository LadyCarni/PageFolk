// Theme tokens for generated covers. A book keeps its color everywhere because it comes from the ID.
export const COVER_COLORS = ['coverForest', 'coverNavy', 'coverPlum', 'claret'] as const

export function coverColor(bookId: string): (typeof COVER_COLORS)[number] {
  let hash = 0
  for (const char of bookId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return COVER_COLORS[hash % COVER_COLORS.length]
}
