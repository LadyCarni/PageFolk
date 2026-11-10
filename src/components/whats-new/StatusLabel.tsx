import { Box, HStack, Text } from '@chakra-ui/react'
import type { ItemThread, MyRequest } from '@/lib/whats-new-view'

type Status = MyRequest['display'] | ItemThread['headerStatus']

// Roadmap statuses: plain uppercase text with a coloured dot, no box.
function Dotted({ text, textColor, dot }: { text: string; textColor: string; dot: string }) {
  return (
    <HStack as="span" display="inline-flex" spacing={1.5} flexShrink={0}>
      <Box as="span" aria-hidden boxSize="7px" borderRadius="full" bg={dot} />
      <Text as="span" fontSize="xs" letterSpacing="0.1em" textTransform="uppercase" color={textColor}>
        {text}
      </Text>
    </HStack>
  )
}

export function StatusLabel({ status }: { status: Status }) {
  switch (status.kind) {
    case 'in_progress':
      return <Dotted text="In progress" textColor="dustyRose" dot="statusGreen" />
    case 'planned':
      return <Dotted text="Planned" textColor="mist" dot="antiqueGold" />
    case 'review':
      return <Text as="span" fontSize="sm" color="mist">Under review</Text>
    case 'roadmap':
      return <Text as="span" fontSize="sm" color="antiqueGold">On the roadmap</Text>
    case 'shipped':
      return <Text as="span" fontSize="sm" color="statusGreen">Shipped in {status.version}</Text>
    case 'not_planned':
      return <Text as="span" fontSize="sm" color="borderMuted">Not planned</Text>
  }
}
