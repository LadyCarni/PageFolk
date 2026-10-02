import NextLink from 'next/link'
import { Box, Button, Flex, Heading, HStack, Link, Text, VStack } from '@chakra-ui/react'
import type { AdminBook } from '@/lib/books'
import { DeleteBookButton } from '@/components/DeleteBookButton'
import { LABEL_PROPS } from '@/components/adminStyles'
import { deleteBookAction, setBookStatusAction } from '@/app/admin/actions'

function StatusBadge({ current }: { current: boolean }) {
  return (
    <Text
      as="span"
      {...LABEL_PROPS}
      flexShrink={0}
      px={3}
      py={0.5}
      borderRadius="full"
      borderWidth="1px"
      borderColor={current ? 'dustyRose' : 'borderMuted'}
      bg={current ? 'claret' : 'transparent'}
      color={current ? 'antiqueGold' : 'mist'}
    >
      {current ? 'Current' : 'Past'}
    </Text>
  )
}

// "Your books": every book, newest first. The title opens its setup on the right.
export function AdminBookList({ books, selectedId }: { books: AdminBook[]; selectedId: string | null }) {
  return (
    <Box as="section" aria-labelledby="your-books-heading">
      <Heading as="h2" id="your-books-heading" size="lg" mb={4}>
        Your books
      </Heading>
      {books.length === 0 ? (
        <Text color="mist" fontStyle="italic">
          No books yet.
        </Text>
      ) : (
        <VStack as="ul" listStyleType="none" align="stretch" spacing={4} m={0} p={0}>
          {books.map((book) => {
            const selected = book.id === selectedId
            const current = book.status === 'current'
            return (
              <Box
                as="li"
                key={book.id}
                p={5}
                bg={selected ? 'bubbleMine' : 'mulberry'}
                borderWidth="1px"
                borderColor={selected ? 'antiqueGold' : 'borderOpen'}
                borderRadius="xl"
                aria-current={selected ? 'true' : undefined}
              >
                <Flex justify="space-between" align="flex-start" gap={3}>
                  <Box minW={0}>
                    <Link
                      as={NextLink}
                      href={`/admin?book=${book.id}`}
                      color="parchment"
                      fontFamily="heading"
                      fontSize="2xl"
                      fontWeight={600}
                    >
                      {book.title}
                    </Link>
                    <Text fontSize="sm" color="mist">
                      {book.author}, {book.totalChapters} chapters
                    </Text>
                  </Box>
                  <StatusBadge current={current} />
                </Flex>
                <HStack mt={4} spacing={3} flexWrap="wrap">
                  <form
                    action={async () => {
                      'use server'
                      await setBookStatusAction(book.id, current ? 'past' : 'current')
                    }}
                  >
                    <Button type="submit" size="sm" variant="goldOutline">
                      {current ? 'Mark as past' : 'Mark as current'}
                    </Button>
                  </form>
                  <DeleteBookButton
                    title={book.title}
                    sectionCount={book.sections.length}
                    postCount={book.sections.reduce((n, s) => n + s._count.posts, 0)}
                    action={async () => {
                      'use server'
                      await deleteBookAction(book.id)
                    }}
                  />
                </HStack>
              </Box>
            )
          })}
        </VStack>
      )}
    </Box>
  )
}
