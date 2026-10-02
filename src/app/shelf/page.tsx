import NextLink from 'next/link'
import { Box, Heading, Link, SimpleGrid, Text } from '@chakra-ui/react'
import { requireUser } from '@/lib/session'
import { listBooks } from '@/lib/books'
import { getProgress } from '@/lib/progress'
import { CoverImage } from '@/components/CoverImage'

export default async function ShelfPage() {
  const user = await requireUser()
  const books = await listBooks('past')
  const cards = await Promise.all(
    books.map(async (book) => ({ book, finished: await getProgress(user.id, book.id) }))
  )

  return (
    <Box p={{ base: 6, md: 10 }}>
      <Heading as="h1" size="xl">
        Our shelf
      </Heading>
      {cards.length === 0 && (
        <Text mt={4} color="mist">
          No past books yet.
        </Text>
      )}
      <SimpleGrid minChildWidth="200px" spacing={8} mt={8}>
        {cards.map(({ book, finished }) => (
          <Link
            key={book.id}
            as={NextLink}
            href={`/shelf/${book.id}`}
            display="block"
            _hover={{ textDecoration: 'none' }}
          >
            <CoverImage book={book} coverVersion={book.cover?.updatedAt.getTime() ?? null} width="100%" />
            <Heading as="h2" size="md" mt={3}>
              {book.title}
            </Heading>
            <Text fontStyle="italic" color="mist">
              {book.author}
            </Text>
            <Text fontSize="sm" color="dustyRose" mt={1}>
              {finished} of {book.totalChapters} chapters
            </Text>
          </Link>
        ))}
      </SimpleGrid>
    </Box>
  )
}
