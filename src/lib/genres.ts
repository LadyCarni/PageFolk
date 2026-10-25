// The genres an admin can pick for a book. Kept free of Prisma so client components can import it.
export const GENRES = [
  'Literary Fiction',
  'Historical Fiction',
  'Mystery',
  'Thriller',
  'Romance',
  'Fantasy',
  'Science Fiction',
  'Horror',
  'Young Adult',
  'Classics',
  'Short Stories',
  'Poetry',
  'Graphic Novel',
  'Memoir',
  'Biography',
  'History',
  'Science',
  'Self-Help',
  'Nonfiction',
] as const

// Empty is valid: saving it clears the genre.
export function validateGenre(genre: string): string | null {
  if (genre === '') return null
  return (GENRES as readonly string[]).includes(genre) ? null : 'Choose a genre from the list'
}
