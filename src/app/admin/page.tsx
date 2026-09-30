import { Box, Button, Heading, HStack, Input, Stack, Text, VStack } from '@chakra-ui/react'
import { requireAdmin } from '@/lib/session'
import { listBooks } from '@/lib/books'
import { createBookAction, addSectionAction, setBookStatusAction } from './actions'

export default async function AdminPage() {
  await requireAdmin()
  const books = await listBooks()

  return (
    <VStack align="stretch" maxW="2xl" mx="auto" p={8} spacing={8}>
      <Heading size="lg" color="brand.900">
        Admin
      </Heading>

      <Box>
        <Heading size="md" mb={2}>
          New book
        </Heading>
        <form action={createBookAction}>
          <HStack>
            <Input name="title" placeholder="Title" required />
            <Input name="author" placeholder="Author" required />
            <Button type="submit" bg="brand.700" color="white" _hover={{ bg: 'brand.900' }}>
              Add book
            </Button>
          </HStack>
        </form>
      </Box>

      <VStack align="stretch" spacing={6}>
        {books.map((book) => (
          <Box key={book.id} borderWidth="1px" borderRadius="md" p={4}>
            <HStack justify="space-between">
              <Heading size="sm">
                {book.title} — {book.author} ({book.status})
              </Heading>
              <form
                action={async () => {
                  'use server'
                  await setBookStatusAction(book.id, book.status === 'current' ? 'past' : 'current')
                }}
              >
                <Button type="submit" size="sm" variant="link" color="brand.700">
                  Mark as {book.status === 'current' ? 'past' : 'current'}
                </Button>
              </form>
            </HStack>
            <Stack as="ul" mt={2} fontSize="sm" color="gray.600" spacing={0}>
              {book.sections.map((s) => (
                <Text as="li" key={s.id}>
                  {s.order}. {s.label}
                </Text>
              ))}
            </Stack>
            <form action={addSectionAction}>
              <input type="hidden" name="bookId" value={book.id} />
              <HStack mt={2}>
                <Input name="label" placeholder="e.g. Chapters 6-10" required />
                <Input name="order" type="number" defaultValue={book.sections.length + 1} w="20" required />
                <Button type="submit" bg="brand.700" color="white" _hover={{ bg: 'brand.900' }}>
                  Add section
                </Button>
              </HStack>
            </form>
          </Box>
        ))}
      </VStack>
    </VStack>
  )
}
