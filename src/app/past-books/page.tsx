import NextLink from 'next/link'
import { Box, Heading, Link, List, ListItem, Text, VStack } from '@chakra-ui/react'
import { requireUser } from '@/lib/session'
import { listBooks } from '@/lib/books'
import { getSectionsForViewer } from '@/lib/sections'
import { SectionActivity } from '@/components/SectionActivity'
import { JoinSectionButton } from '@/components/JoinSectionButton'
import { joinSectionAction } from '@/app/sections/actions'

export default async function PastBooksPage() {
  const user = await requireUser()
  const books = await listBooks('past')

  return (
    <VStack align="stretch" p={8} spacing={8}>
      <Heading size="lg" color="brand.900">
        Past books
      </Heading>
      {books.length === 0 && <Text color="gray.500">No past books yet.</Text>}
      {await Promise.all(
        books.map(async (book) => {
          const sections = await getSectionsForViewer(book.id, user.id)
          return (
            <Box key={book.id}>
              <Heading size="md">
                {book.title}{' '}
                <Text as="span" color="gray.500" fontWeight="normal">
                  by {book.author}
                </Text>
              </Heading>
              <List spacing={2} mt={2}>
                {sections.map((section) => (
                  <ListItem
                    key={section.id}
                    borderWidth="1px"
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
          )
        })
      )}
    </VStack>
  )
}
