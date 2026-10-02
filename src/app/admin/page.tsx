import NextLink from 'next/link'
import { Box, Flex, Grid, Heading, Input, Link, Text, VStack } from '@chakra-ui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faPlus } from '@fortawesome/free-solid-svg-icons'
import { requireAdmin } from '@/lib/session'
import { listBooks } from '@/lib/books'
import { getClubName } from '@/lib/club'
import { pickAdminBook } from '@/lib/admin-view'
import { NAV_HEIGHT_PX } from '@/lib/layout'
import { AdminForm, AdminFormActions } from '@/components/AdminForm'
import { AdminBookList } from '@/components/AdminBookList'
import { BookSetup } from '@/components/BookSetup'
import { CARD_PROPS, LABEL_PROPS } from '@/components/adminStyles'
import { createBookAction, updateClubNameAction } from './actions'

function FieldLabel({ children }: { children: string }) {
  return (
    <Text fontSize="sm" color="parchment" mb={1}>
      {children}
    </Text>
  )
}

// Two columns like the main page: club settings and the book list on the left, the chosen
// book's setup on the right. The book comes from ?book=ID. On small screens one column shows
// at a time: the left until a book is explicitly chosen, then that book's setup.
export default async function AdminPage({ searchParams }: { searchParams: { book?: string | string[] } }) {
  await requireAdmin()
  const [books, clubName] = await Promise.all([listBooks(), getClubName()])
  const requested = typeof searchParams.book === 'string' ? searchParams.book : undefined
  const { book, explicit } = pickAdminBook(books, requested)
  const fullHeight = `calc(100dvh - ${NAV_HEIGHT_PX}px)`

  return (
    <Grid templateColumns={{ base: '1fr', lg: '1fr 2fr' }} h={{ lg: fullHeight }} minH={{ base: fullHeight }}>
      <Box
        as="aside"
        aria-label="Admin"
        display={{ base: explicit ? 'none' : 'block', lg: 'block' }}
        overflowY={{ lg: 'auto' }}
        minH={0}
      >
        <VStack align="stretch" spacing={8} p={{ base: 6, md: 8 }}>
          <Box>
            <Heading as="h1" size="2xl">
              Club admin
            </Heading>
            <Text color="mist" mt={2}>
              Name your club, add books and shape the conversations.
            </Text>
          </Box>

          <Box {...CARD_PROPS}>
            <Text {...LABEL_PROPS} color="dustyRose" mb={3}>
              Club name
            </Text>
            <AdminForm
              action={updateClubNameAction}
              rule={{ kind: 'clubName' }}
              mode="edit"
              submitLabel="Save"
              submitVariant="goldOutline"
              showSaved
            >
              <Input
                name="clubName"
                defaultValue={clubName ?? ''}
                placeholder="e.g. The Thursday Readers"
                aria-label="Club name"
                borderRadius="full"
              />
            </AdminForm>
            <Text fontSize="sm" color="mist" mt={3}>
              Shown in the top bar for every member.
            </Text>
          </Box>

          <Box {...CARD_PROPS}>
            <Heading as="h2" size="lg" mb={4}>
              Add a new book
            </Heading>
            <AdminForm
              action={createBookAction}
              rule={{ kind: 'newBook' }}
              mode="create"
              submitLabel="Add book"
              submitIcon={<FontAwesomeIcon icon={faPlus} />}
              submitVariant="solid"
              layout="custom"
            >
              <VStack align="stretch" spacing={4}>
                <Box as="label" display="block">
                  <FieldLabel>Title</FieldLabel>
                  <Input name="title" placeholder="e.g. Rebecca" required />
                </Box>
                <Box as="label" display="block">
                  <FieldLabel>Author</FieldLabel>
                  <Input name="author" placeholder="e.g. Daphne du Maurier" required />
                </Box>
                <Flex gap={3} align="flex-end" wrap="wrap">
                  <Box as="label" display="block" flex="1" minW="100px">
                    <FieldLabel>Number of chapters</FieldLabel>
                    <Input name="totalChapters" type="number" min={1} required />
                  </Box>
                  <AdminFormActions />
                </Flex>
              </VStack>
            </AdminForm>
          </Box>

          <AdminBookList books={books} selectedId={book?.id ?? null} />
        </VStack>
      </Box>

      <Box
        as="main"
        display={{ base: explicit ? 'block' : 'none', lg: 'block' }}
        bg="panel"
        borderLeftWidth={{ lg: '1px' }}
        borderColor="divider"
        overflowY={{ lg: 'auto' }}
        minH={0}
      >
        <Link
          as={NextLink}
          href="/admin"
          display={{ base: 'inline-flex', lg: 'none' }}
          alignItems="center"
          gap={2}
          px={6}
          pt={6}
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          Back to books
        </Link>
        {book ? (
          <BookSetup book={book} />
        ) : (
          <Flex h="100%" minH="50vh" align="center" justify="center" p={8}>
            <Heading as="h2" size="lg" fontStyle="italic" color="mist" textAlign="center">
              Add a book to start setting it up.
            </Heading>
          </Flex>
        )}
      </Box>
    </Grid>
  )
}
