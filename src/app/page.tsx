import NextLink from 'next/link'
import { Box, Flex, Heading, Image, Link, List, ListItem, Text } from '@chakra-ui/react'
import { requireUser } from '@/lib/session'
import { listBooks } from '@/lib/books'
import { getSectionsForViewer } from '@/lib/sections'
import { DiscussionPromptCard } from '@/components/DiscussionPromptCard'
import { SectionActivity } from '@/components/SectionActivity'
import { JoinSectionButton } from '@/components/JoinSectionButton'
import { joinSectionAction } from './sections/actions'

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

  const sections = await getSectionsForViewer(book.id, user.id)

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
              <Heading size="lg" color="brand.900" mb={4}>
                {book.title}{' '}
                <Text as="span" color="brand.300" fontWeight="normal">
                  by {book.author}
                </Text>
              </Heading>
              <Text color="brand.700">
                {sections.length === 0
                  ? "Discussion threads for this book will open up soon. Start reading, and check back shortly to join the conversation!"
                  : "No spoilers here! Every discussion thread starts locked. When you finish a set of chapters, join its thread and jump into the conversation. We've been waiting to hear what you think!"}
              </Text>
            </Box>
          </Flex>
          <List spacing={2}>
            {sections.map((section) => (
              <ListItem
                key={section.id}
                borderWidth="1px"
                borderColor="brand.500"
                bg="brand.50"
                borderRadius="md"
                p={3}
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Box>
                  {section.status === 'locked' ? (
                    <Text color="brand.700" fontWeight={500} fontSize="lg">
                      Discuss {section.label}
                    </Text>
                  ) : (
                    <Link
                      as={NextLink}
                      href={`/sections/${section.id}`}
                      color="brand.700"
                      fontWeight={500}
                      fontSize="lg"
                    >
                      Discuss {section.label}
                    </Link>
                  )}
                  {section.status === 'unlocked' && (
                    <SectionActivity postCount={section.postCount} lastPostAt={section.lastPostAt} />
                  )}
                </Box>
                {section.status === 'locked' && (
                  <JoinSectionButton
                    action={async () => {
                      'use server'
                      await joinSectionAction(section.id)
                    }}
                  />
                )}
              </ListItem>
            ))}
          </List>
      </Box>
      <Box w={{ base: '100%', lg: '22rem' }} flexShrink={0}>
        <DiscussionPromptCard />
      </Box>
    </Flex>
  )
}
