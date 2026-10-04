import { Box, Flex, Heading, Text } from '@chakra-ui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBookmark } from '@fortawesome/free-solid-svg-icons'
import { requireUser } from '@/lib/session'
import { getShelf } from '@/lib/shelf'
import { shelfSummary } from '@/lib/shelf-view'
import { ShelfBrowser } from '@/components/ShelfBrowser'

export default async function ShelfPage({ searchParams }: { searchParams: { book?: string | string[] } }) {
  const user = await requireUser()
  const books = await getShelf(user.id)
  const requestedId = typeof searchParams.book === 'string' ? searchParams.book : undefined

  if (books.length === 0) {
    return (
      <Box as="main" p={{ base: 6, md: 10 }}>
        <Heading as="h1" size="2xl">
          Our shelf
        </Heading>
        <Text mt={4} color="mist">
          No past books yet.
        </Text>
      </Box>
    )
  }

  return (
    <ShelfBrowser books={books} requestedId={requestedId}>
      <Heading as="h1" size="2xl">
        Our shelf
      </Heading>
      <Text mt={2} color="mist">
        {shelfSummary(books.length, books.filter((book) => book.read).length)}
      </Text>
      <Flex
        mt={6}
        gap={5}
        align="center"
        bg="velvet"
        borderWidth="1px"
        borderColor="border"
        borderRadius="2xl"
        px={6}
        py={5}
      >
        <Box aria-hidden color="antiqueGold" fontSize="3xl" flexShrink={0}>
          <FontAwesomeIcon icon={faBookmark} />
        </Box>
        <Box>
          <Heading as="h2" size="md">
            A gold bookmark means you have read it
          </Heading>
          <Text mt={1} fontSize="sm" color="mist">
            Books you have finished have their conversations open to you. The rest stay sealed, so nothing gets spoiled.
          </Text>
        </Box>
      </Flex>
    </ShelfBrowser>
  )
}
