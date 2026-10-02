import { VStack } from '@chakra-ui/react'
import type { AdminBook } from '@/lib/books'
import { chapterCoverage } from '@/lib/chapters'
import { BookSetupHeader } from '@/components/BookSetupHeader'
import { DescriptionCoverCard } from '@/components/DescriptionCoverCard'

// The right column of the admin page: everything to set up one book.
// Client parts are keyed by the book so switching books resets any open edit.
export function BookSetup({ book }: { book: AdminBook }) {
  const coverage = chapterCoverage(book.totalChapters, book.sections)
  const coverVersion = book.cover?.updatedAt.getTime() ?? null

  return (
    <VStack align="stretch" spacing={8} p={{ base: 6, md: 10 }}>
      <BookSetupHeader
        key={book.id}
        bookId={book.id}
        title={book.title}
        author={book.author}
        totalChapters={book.totalChapters}
        minTotal={Math.max(0, ...book.sections.map((s) => s.endChapter))}
        completion={{ description: Boolean(book.blurb), cover: coverVersion !== null, sections: coverage.complete }}
      />
      <DescriptionCoverCard book={book} coverVersion={coverVersion} />
    </VStack>
  )
}
