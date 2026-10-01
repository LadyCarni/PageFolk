import { Box, Button, Heading, HStack, Input, Stack, Text, VStack } from '@chakra-ui/react'
import { requireAdmin } from '@/lib/session'
import { listBooks } from '@/lib/books'
import { sectionDisplayName } from '@/lib/chapters'
import { AdminForm } from '@/components/AdminForm'
import { CoverUpload } from '@/components/CoverUpload'
import { DeleteBookButton } from '@/components/DeleteBookButton'
import { DeleteSectionButton } from '@/components/DeleteSectionButton'
import {
  createBookAction,
  addSectionAction,
  setBookStatusAction,
  updateSectionAction,
  updateTotalChaptersAction,
  deleteSectionAction,
  deleteBookAction,
  uploadCoverAction,
  removeCoverAction,
} from './actions'

function sectionRanges(book: { sections: { id: string; startChapter: number; endChapter: number; title: string | null }[] }) {
  return book.sections.map(({ id, startChapter, endChapter, title }) => ({ id, startChapter, endChapter, title }))
}

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
        <AdminForm
          action={createBookAction}
          rule={{ kind: 'newBook' }}
          mode="create"
          submitLabel="Add book"
          solid
          submitWidth="200px"
        >
          <Input name="title" placeholder="Title" required />
          <Input name="author" placeholder="Author" required />
          <Input
            name="totalChapters"
            type="number"
            min={1}
            placeholder="Chapters"
            aria-label="Total chapters"
            required
            w="120px"
            flexShrink={0}
          />
        </AdminForm>
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
            <AdminForm
              action={updateTotalChaptersAction}
              rule={{ kind: 'total', minTotal: Math.max(0, ...book.sections.map((s) => s.endChapter)) }}
              mode="edit"
              submitLabel="Save"
              hiddenFields={{ bookId: book.id }}
              mt={3}
            >
              <Text fontSize="sm" color="gray.600">
                Total chapters
              </Text>
              <Input
                name="totalChapters"
                type="number"
                min={1}
                defaultValue={book.totalChapters}
                aria-label="Total chapters"
                size="sm"
                w="90px"
                required
              />
            </AdminForm>
            <CoverUpload
              bookId={book.id}
              title={book.title}
              coverVersion={book.cover?.updatedAt.getTime() ?? null}
              uploadAction={uploadCoverAction}
              removeAction={async () => {
                'use server'
                await removeCoverAction(book.id)
              }}
            />
            <Stack spacing="1em" mt="1em">
              {book.sections.map((s) => (
                <HStack key={s.id} spacing={2}>
                  <Text fontSize="sm" color="gray.600" flexShrink={0}>
                    {s.order}.
                  </Text>
                  <Box flex="1">
                    <AdminForm
                      action={updateSectionAction}
                      rule={{ kind: 'section', totalChapters: book.totalChapters, others: sectionRanges(book), ignoreId: s.id }}
                      mode="edit"
                      submitLabel="Save"
                      hiddenFields={{ sectionId: s.id }}
                    >
                      <Input
                        name="startChapter"
                        type="number"
                        min={1}
                        defaultValue={s.startChapter}
                        aria-label="Start chapter"
                        size="sm"
                        w="80px"
                        required
                      />
                      <Text fontSize="sm">to</Text>
                      <Input
                        name="endChapter"
                        type="number"
                        min={1}
                        defaultValue={s.endChapter}
                        aria-label="End chapter"
                        size="sm"
                        w="80px"
                        required
                      />
                      <Input
                        name="title"
                        defaultValue={s.title ?? ''}
                        placeholder="Title (optional)"
                        aria-label="Title"
                        size="sm"
                        flex="1"
                        maxW="40%"
                      />
                    </AdminForm>
                  </Box>
                  <DeleteSectionButton
                    label={sectionDisplayName(s)}
                    postCount={s._count.posts}
                    action={async () => {
                      'use server'
                      await deleteSectionAction(s.id)
                    }}
                  />
                </HStack>
              ))}
            </Stack>
            <AdminForm
              action={addSectionAction}
              rule={{ kind: 'section', totalChapters: book.totalChapters, others: sectionRanges(book) }}
              mode="create"
              submitLabel="Add section"
              solid
              hiddenFields={{ bookId: book.id }}
              mt="2em"
            >
              <Input
                name="startChapter"
                type="number"
                min={1}
                placeholder="From"
                aria-label="Start chapter"
                required
                w="90px"
                flexShrink={0}
              />
              <Text>to</Text>
              <Input
                name="endChapter"
                type="number"
                min={1}
                placeholder="To"
                aria-label="End chapter"
                required
                w="90px"
                flexShrink={0}
              />
              <Input name="title" placeholder="Title (optional), e.g. Lowood" aria-label="Title" flex="1" maxW="40%" />
            </AdminForm>
          </Box>
        ))}
      </VStack>
    </VStack>
  )
}
