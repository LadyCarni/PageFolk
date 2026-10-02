import { Heading, Text, VStack } from '@chakra-ui/react'
import type { AdminBook } from '@/lib/books'
import { LABEL_PROPS } from '@/components/adminStyles'

// The right column of the admin page: everything to set up one book.
export function BookSetup({ book }: { book: AdminBook }) {
  return (
    <VStack align="stretch" spacing={8} p={{ base: 6, md: 10 }}>
      <div>
        <Text {...LABEL_PROPS} color="dustyRose">
          Book setup
        </Text>
        <Heading as="h1" size="2xl" mt={1}>
          {book.title}
        </Heading>
      </div>
    </VStack>
  )
}
