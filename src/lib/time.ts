const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** Compact relative time: now, 23min, 1h, 6d, 4w, 5m, 2y. */
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const elapsed = now.getTime() - date.getTime()
  if (elapsed < MINUTE) return 'now'
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}min`
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h`

  const days = Math.floor(elapsed / DAY)
  if (days < 7) return `${days}d`
  if (days < 30) return `${Math.floor(days / 7)}w`
  if (days < 365) return `${Math.floor(days / 30)}m`
  return `${Math.floor(days / 365)}y`
}
