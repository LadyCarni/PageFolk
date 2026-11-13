// Thrown for input the user can fix (out-of-range chapters, overlaps, blank fields).
// Server actions turn these into an error message on the form; every other error
// (e.g. "Forbidden: admin only") still throws.
export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export type FormResult = { error?: string }

// Turns the user-fixable ValidationError into a message the form can show.
// Everything else (e.g. "Forbidden: admin only") still throws.
export async function reportingValidation(work: () => Promise<void>): Promise<FormResult> {
  try {
    await work()
    return {}
  } catch (error) {
    if (error instanceof ValidationError) return { error: error.message }
    throw error
  }
}

// A suggestion that matches a book already on the Long List or in the club's books.
// href points at where that book lives, or is null when there is nowhere to link.
export class DuplicateBookError extends ValidationError {
  constructor(
    message: string,
    readonly href: string | null,
  ) {
    super(message)
    this.name = 'DuplicateBookError'
  }
}
