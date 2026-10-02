import { notFound } from 'next/navigation'
import { Box, Text } from '@chakra-ui/react'
import { requireUser } from '@/lib/session'
import { listBooks } from '@/lib/books'
import { getBookView } from '@/lib/book-view'
import { BookView } from '@/components/BookView'

export default async function HomePage({ searchParams }: { searchParams: { thread?: string | string[] } }) {
  const user = await requireUser()
  const [book] = await listBooks('current')

  if (!book) {
    return (
      <Box p={8}>
        <Text>No current book yet — check back soon.</Text>
      </Box>
    )
  }

  const requested = typeof searchParams.thread === 'string' ? searchParams.thread : undefined
  const data = await getBookView(book.id, user.id, requested)
  if (!data) notFound()

  return <BookView data={data} viewerId={user.id} basePath="/" label="This month's book" />
}
