import { Box, Heading, Link, Text } from '@chakra-ui/react'
import NextLink from 'next/link'

export const metadata = { title: 'Terms · PageFolk' }

// Public (excluded in middleware): linked from Google's OAuth consent screen.
export default function TermsPage() {
  return (
    <Box maxW="2xl" mx="auto" p={{ base: 6, md: 10 }}>
      <Heading as="h1" size="xl">
        Terms
      </Heading>
      <Text mt={6}>
        PageFolk is a small, private book club app, run as a hobby for the people in the club. By using it, you agree
        to these simple terms.
      </Text>
      <Heading as="h2" size="md" mt={8}>
        Joining
      </Heading>
      <Text mt={3}>
        Signing in with Google sends a request to join. The club admin decides who gets in, and can remove access at
        any time.
      </Text>
      <Heading as="h2" size="md" mt={8}>
        Be kind
      </Heading>
      <Text mt={3}>
        Keep notes friendly and about the books. The admin may remove posts or members that make the club an unpleasant
        place to be.
      </Text>
      <Heading as="h2" size="md" mt={8}>
        Your posts
      </Heading>
      <Text mt={3}>
        What you post stays yours. It&apos;s shown only to other club members, and you can ask to have it removed.
      </Text>
      <Heading as="h2" size="md" mt={8}>
        No guarantees
      </Heading>
      <Text mt={3}>
        The app is provided as is, free of charge. It may change, have downtime or shut down, and data could be lost.
      </Text>
      <Text mt={10}>
        See also the{' '}
        <Link as={NextLink} href="/privacy" color="antiqueGold">
          privacy page
        </Link>
        .{' '}
        <Link as={NextLink} href="/" color="antiqueGold">
          Back to PageFolk
        </Link>
      </Text>
    </Box>
  )
}
