import NextLink from 'next/link'
import { Box, Heading, Link, List, ListItem, Text } from '@chakra-ui/react'
import { requireUser } from '@/lib/session'
import { listBooks } from '@/lib/books'
import { getSectionsForViewer } from '@/lib/sections'
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
    <Box p={8}>
      <Heading size="lg" color="brand.900" mb={4}>
        {book.title}{' '}
        <Text as="span" color="brand.300" fontWeight="normal">
          by {book.author}
        </Text>
      </Heading>
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
            {section.status === 'locked' ? (
              <JoinSectionButton
                label={section.label}
                action={async () => {
                  'use server'
                  await joinSectionAction(section.id)
                }}
              />
            ) : (
              <Link as={NextLink} href={`/sections/${section.id}`} color="brand.700">
                {section.label} ({section.postCount} posts)
              </Link>
            )}
          </ListItem>
        ))}
      </List>
    </Box>
  )
}
