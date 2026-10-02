import { Box, Heading, Text, VStack } from '@chakra-ui/react'
import type { SectionSummary } from '@/lib/sections'
import { ThreadCard } from '@/components/ThreadCard'

export function ThreadList({
  sections,
  selectedId,
  basePath,
}: {
  sections: SectionSummary[]
  selectedId: string | null
  basePath: string
}) {
  return (
    <Box p={8}>
      <Heading as="h2" size="lg">
        The conversations
      </Heading>
      <Text mt={2} color="mist">
        {sections.length === 0
          ? 'Discussion threads for this book will open up soon. Start reading, and check back shortly!'
          : 'Threads open once you finish its last chapter. Sealed threads show nothing so no spoilers!'}
      </Text>
      <VStack as="ul" align="stretch" spacing={4} mt={6} p={0}>
        {sections.map((section) => (
          <ThreadCard key={section.id} section={section} active={section.id === selectedId} basePath={basePath} />
        ))}
      </VStack>
    </Box>
  )
}
