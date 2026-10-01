import { Box, Flex, Heading, Image, List, Text } from '@chakra-ui/react'
import { requireUser } from '@/lib/session'
import { listBooks } from '@/lib/books'
import { getSectionsForViewer } from '@/lib/sections'
import { getProgress } from '@/lib/progress'
import { DiscussionPromptCard } from '@/components/DiscussionPromptCard'
import { ProgressStepper } from '@/components/ProgressStepper'
import { SectionRow } from '@/components/SectionRow'
import { setProgressAction } from './sections/actions'

export default async function HomePage() {
  const user = await requireUser()
  const [book] = await listBooks('current')

  if (!book) {
    return (
      <Box p={8}>
        <Text>No current book yet — check back soon.</Text>
      </Box>
    )
  }

  const [sections, finished] = await Promise.all([
    getSectionsForViewer(book.id, user.id),
    getProgress(user.id, book.id),
  ])

  return (
    <Flex p={8} gap={8} direction={{ base: 'column', lg: 'row' }} align="flex-start">
      <Box flex="1" minW={0} w="100%">
          <Flex gap={5} align="flex-start" mb={4}>
            {book.cover && (
              <Image
                src={`/books/${book.id}/cover?v=${book.cover.updatedAt.getTime()}`}
                alt={`Cover of ${book.title}`}
                w={{ base: '80px', md: '120px' }}
                flexShrink={0}
                borderRadius="md"
                boxShadow="md"
              />
            )}
            <Box>
              <Heading size="lg" mb={4}>
                {book.title}{' '}
                <Text as="span" color="mist" fontWeight="normal" fontStyle="italic">
                  by {book.author}
                </Text>
              </Heading>
              <Text>
                {sections.length === 0
                  ? "Discussion threads for this book will open up soon. Start reading, and check back shortly to join the conversation!"
                  : "No spoilers here! Every discussion thread starts sealed. As you read, move your place in the book forward, and each thread opens once you finish its last chapter. We've been waiting to hear what you think!"}
              </Text>
            </Box>
          </Flex>
          <List spacing={2}>
            {sections.map((section) => (
              <SectionRow key={section.id} section={section} />
            ))}
          </List>
      </Box>
      <Box w={{ base: '100%', lg: '22rem' }} flexShrink={0}>
        <Box mb={4}>
          <ProgressStepper
            bookId={book.id}
            totalChapters={book.totalChapters}
            initialFinished={finished}
            sections={sections}
            saveProgress={setProgressAction}
          />
        </Box>
        <DiscussionPromptCard />
      </Box>
    </Flex>
  )
}
