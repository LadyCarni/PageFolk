import { Box, Button, Heading, HStack, Input, Stack, Text, VStack } from '@chakra-ui/react'
import { requireAdmin } from '@/lib/session'
import { listBooks } from '@/lib/books'
import { DeleteBookButton } from '@/components/DeleteBookButton'
import { DeleteSectionButton } from '@/components/DeleteSectionButton'
import {
  createBookAction,
  addSectionAction,
  setBookStatusAction,
  updateSectionLabelAction,
  deleteSectionAction,
  deleteBookAction,
} from './actions'

export default async function AdminPage() {
  await requireAdmin()
  const books = await listBooks()

  return (
    <VStack align="stretch" p={8} spacing={8}>
      <Heading size="lg" color="brand.900">
        Admin
      </Heading>

      <Box>
        <Heading size="md" mb={2}>
          New book
        </Heading>
        <form
          action={async (formData: FormData) => {
            'use server'
            await createBookAction(formData)
          }}
        >
          <HStack>
            <Input name="title" placeholder="Title" required />
            <Input name="author" placeholder="Author" required />
            <Button
              type="submit"
              bg="brand.700"
              color="white"
              _hover={{ bg: 'brand.900' }}
              w="200px"
              flexShrink={0}
            >
              Add book
            </Button>
          </HStack>
        </form>
      </Box>

      <VStack align="stretch" spacing={6}>
        {books.map((book) => (
          <Box key={book.id} borderWidth="1px" borderColor="#e7b7a6" borderRadius="md" p={4}>
            <HStack justify="space-between">
              <Heading size="sm">
                {book.title} — {book.author} ({book.status})
              </Heading>
              <HStack spacing={4}>
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
            </HStack>
            <Stack spacing="1em" mt="1em">
              {book.sections.map((s) => (
                <HStack key={s.id} spacing={2}>
                  <Text fontSize="sm" color="gray.600" flexShrink={0}>
                    {s.order}.
                  </Text>
                  <Box flex="1">
                    <form
                      action={async (formData: FormData) => {
                        'use server'
                        await updateSectionLabelAction(formData)
                      }}
                    >
                      <input type="hidden" name="sectionId" value={s.id} />
                      <HStack>
                        <Input name="label" defaultValue={s.label} size="sm" required flex="1" maxW="40%" />
                        <Button type="submit" size="sm" variant="link" color="brand.700" flexShrink={0}>
                          Rename
                        </Button>
                      </HStack>
                    </form>
                  </Box>
                  <DeleteSectionButton
                    label={s.label}
                    postCount={s._count.posts}
                    action={async () => {
                      'use server'
                      await deleteSectionAction(s.id)
                    }}
                  />
                </HStack>
              ))}
            </Stack>
            <form action={addSectionAction}>
              <input type="hidden" name="bookId" value={book.id} />
              <HStack mt="2em">
                <Input name="label" placeholder="e.g. Chapters 6-10" required flex="1" maxW="40%" />
                <Button type="submit" bg="brand.700" color="white" _hover={{ bg: 'brand.900' }} flexShrink={0}>
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
