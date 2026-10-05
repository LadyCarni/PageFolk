// Upcoming books are being prepared by an admin and stay hidden from members until made current.
export function canViewBook(status: string, isAdmin: boolean): boolean {
  return status !== 'upcoming' || isAdmin
}
