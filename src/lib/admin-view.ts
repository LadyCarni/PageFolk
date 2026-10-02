// Which book the admin page's right column shows. `books` is newest first, as listBooks() returns.
// The requested book when it exists; otherwise the first current book, then the newest book.
// `explicit` is true only when the URL named a real book (small screens then show its setup).
export function pickAdminBook<T extends { id: string; status: string }>(
  books: T[],
  requestedId?: string
): { book: T | null; explicit: boolean } {
  const requested = requestedId ? books.find((b) => b.id === requestedId) : undefined
  if (requested) return { book: requested, explicit: true }
  return { book: books.find((b) => b.status === 'current') ?? books[0] ?? null, explicit: false }
}
