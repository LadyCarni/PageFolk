'use client'

import { startTransition, useOptimistic, useRef } from 'react'
import { Button, Flex, Text, useToast } from '@chakra-ui/react'
import { toggleLongListVoteAction } from '@/app/long-list/actions'
import { likeLabel } from '@/lib/long-list-view'

// Optimistic vote toggle. Taps are ignored while one is still in flight.
export function LongListVoteButton({ bookId, votes, voted }: { bookId: string; votes: number; voted: boolean }) {
  const [shown, flip] = useOptimistic({ votes, voted }, (cur) => ({
    votes: cur.votes + (cur.voted ? -1 : 1),
    voted: !cur.voted,
  }))
  const inFlight = useRef(false)
  const toast = useToast()

  return (
    <Flex align="center" gap={3} flexShrink={0}>
      <Button
        size="sm"
        variant="unstyled"
        display="inline-flex"
        alignItems="center"
        px={4}
        h="32px"
        borderRadius="full"
        borderWidth="1px"
        borderColor={shown.voted ? 'antiqueGold' : 'border'}
        bg={shown.voted ? 'antiqueGold' : 'transparent'}
        color={shown.voted ? 'onGold' : 'parchment'}
        fontWeight="semibold"
        aria-pressed={shown.voted}
        onClick={() => {
          if (inFlight.current) return
          inFlight.current = true
          startTransition(async () => {
            flip(undefined)
            try {
              const result = await toggleLongListVoteAction(bookId)
              if (result?.error) toast({ status: 'error', title: result.error, isClosable: true })
            } finally {
              inFlight.current = false
            }
          })
        }}
      >
        {shown.voted ? '✓ Liked' : 'Like'}
      </Button>
      <Text fontSize="sm" color="mist" minW="56px">
        {likeLabel(shown.votes)}
      </Text>
    </Flex>
  )
}
