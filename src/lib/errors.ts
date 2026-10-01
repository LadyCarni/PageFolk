// Thrown for input the user can fix (out-of-range chapters, overlaps, blank fields).
// Server actions turn these into an error message on the form; every other error
// (e.g. "Forbidden: admin only") still throws.
export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}
