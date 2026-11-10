import NextLink from 'next/link'
import { Box, Flex, Text } from '@chakra-ui/react'
import type { RoadmapCard as Card } from '@/lib/whats-new-view'
import { MemberRequestBadge } from './MemberRequestBadge'
import { StatusLabel } from './StatusLabel'
import { UpvoteButton } from './UpvoteButton'

export function RoadmapCard({ card, selected }: { card: Card; selected: boolean }) {
  return (
    <Flex
      gap={3}
      p={4}
      borderWidth="1px"
      borderRadius="xl"
      borderColor={selected ? 'borderOpen' : 'border'}
      bg={selected ? 'bubbleMine' : 'velvet'}
    >
      <UpvoteButton itemId={card.id} votes={card.votes} voted={card.votedByViewer} />
      <Box
        as={NextLink}
        href={`/whats-new?item=${card.id}`}
        scroll={false}
        flex="1"
        minW={0}
        aria-current={selected ? 'true' : undefined}
      >
        <Flex justify="space-between" align="flex-start" gap={3}>
          <Text as="span" fontWeight={600} color="parchment">
            {card.title}{' '}
            {card.isMemberRequest && <MemberRequestBadge />}
          </Text>
          <StatusLabel status={{ kind: card.status }} />
        </Flex>
        <Text mt={1} fontSize="sm" noOfLines={2}>
          {card.description}
        </Text>
      </Box>
    </Flex>
  )
}
