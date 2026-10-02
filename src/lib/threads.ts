import type { SectionSummary } from '@/lib/sections'

// The open thread with the highest order, i.e. the latest chapters the reader has unlocked.
export function pickDefaultThread(sections: SectionSummary[]): string | null {
  let best: SectionSummary | null = null
  for (const section of sections) {
    if (section.status === 'unlocked' && (!best || section.order > best.order)) best = section
  }
  return best?.id ?? null
}

// A requested thread counts only if it is open. Sealed, unknown and empty requests fall back
// to the default and are not "explicit", so a sealed thread's existence is never confirmed.
export function resolveSelectedThread(
  sections: SectionSummary[],
  requestedId: string | undefined
): { selectedId: string | null; explicit: boolean } {
  const requested = requestedId
    ? sections.find((section) => section.id === requestedId && section.status === 'unlocked')
    : undefined
  if (requested) return { selectedId: requested.id, explicit: true }
  return { selectedId: pickDefaultThread(sections), explicit: false }
}

export function bookPath(bookId: string, currentBookId: string | null): string {
  return bookId === currentBookId ? '/' : `/shelf/${bookId}`
}

export function threadHref(bookId: string, currentBookId: string | null, threadId: string): string {
  return `${bookPath(bookId, currentBookId)}?thread=${encodeURIComponent(threadId)}`
}
