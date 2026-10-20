import { Box, Heading, Link, ListItem, Text, UnorderedList } from '@chakra-ui/react'
import NextLink from 'next/link'

export const metadata = { title: 'Privacy · PageFolk' }

// Public (excluded in middleware): Google requires a privacy policy URL to publish the OAuth app.
export default function PrivacyPage() {
  const contact = process.env.ADMIN_EMAIL

  return (
    <Box maxW="2xl" mx="auto" p={{ base: 6, md: 10 }}>
      <Heading as="h1" size="xl">
        Privacy
      </Heading>
      <Text mt={6}>
        PageFolk is a small, private book club app. When you sign in with Google, it receives your name, email
        address and profile picture.
      </Text>
      <Heading as="h2" size="md" mt={8}>
        What&apos;s stored
      </Heading>
      <UnorderedList mt={3} spacing={2}>
        <ListItem>Your Google name, email address and profile picture.</ListItem>
        <ListItem>The notes you post and your reading progress.</ListItem>
        <ListItem>If you ask to join, your request, until it&apos;s approved or dismissed.</ListItem>
      </UnorderedList>
      <Heading as="h2" size="md" mt={8}>
        How it&apos;s used
      </Heading>
      <Text mt={3}>
        Only to run the club: to let you sign in and to show your name next to your notes. Other members never see your
        email address. Nothing is sold, shared with anyone else or used for advertising.
      </Text>
      <Heading as="h2" size="md" mt={8}>
        Deleting your data
      </Heading>
      <Text mt={3}>
        To have your account and everything you&apos;ve posted removed,{' '}
        {contact ? (
          <>
            email{' '}
            <Link href={`mailto:${contact}`} color="antiqueGold">
              {contact}
            </Link>
          </>
        ) : (
          'contact the club admin'
        )}
        .
      </Text>
      <Text mt={10}>
        <Link as={NextLink} href="/" color="antiqueGold">
          Back to PageFolk
        </Link>
      </Text>
    </Box>
  )
}
