import { Box, Heading, List, Text, VStack } from '@chakra-ui/react'
import { requireUser } from '@/lib/session'
import { listBooks } from '@/lib/books'
import { getSectionsForViewer } from '@/lib/sections'
import { getProgress } from '@/lib/progress'
import { ProgressStepper } from '@/components/ProgressStepper'
import { SectionRow } from '@/components/SectionRow'
import { setProgressAction } from '@/app/sections/actions'

export default async function PastBooksPage() {
  const user = await requireUser()
  const books = await listBooks('past')

  return (
    <VStack align="stretch" p={8} spacing={8}>
      <Heading size="lg">
        Past books
      </Heading>
      {books.length === 0 && <Text color="mist">No past books yet.</Text>}
      {await Promise.all(
        books.map(async (book) => {
          const [sections, finished] = await Promise.all([
            getSectionsForViewer(book.id, user.id),
            getProgress(user.id, book.id),
          ])
          return (
            <Box key={book.id}>
              <Heading size="md">
                {book.title}{' '}
                <Text as="span" color="mist" fontWeight="normal" fontStyle="italic">
                  by {book.author}
                </Text>
              </Heading>
              <Box mt={3} maxW="22rem">
                <ProgressStepper
                  bookId={book.id}
                  totalChapters={book.totalChapters}
                  initialFinished={finished}
                  sections={sections}
                  saveProgress={setProgressAction}
                />
              </Box>
              <List spacing={2} mt={3}>
                {sections.map((section) => (
                  <SectionRow key={section.id} section={section} />
                ))}
              </List>
            </Box>
          )
        })
      )}
    </VStack>
  )
}
