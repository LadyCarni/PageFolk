'use client'

import { startTransition, useOptimistic, useRef } from 'react'
import { Button } from '@chakra-ui/react'
import { toggleVoteAction } from '@/app/whats-new/actions'

// Optimistic vote toggle. Taps are ignored while one is still in flight.
export function UpvoteButton({ itemId, votes, voted }: { itemId: string; votes: number; voted: boolean }) {
  const [shown, flip] = useOptimistic({ votes, voted }, (cur) => ({
    votes: cur.votes + (cur.voted ? -1 : 1),
    voted: !cur.voted,
  }))
  const inFlight = useRef(false)

  return (
    <Button
      flexShrink={0}
      h="auto"
      minW="52px"
      py={2}
      px={2}
      flexDirection="column"
      gap={0}
      variant="unstyled"
      display="flex"
      borderWidth="1px"
      borderRadius="lg"
      borderColor={shown.voted ? 'antiqueGold' : 'border'}
      color={shown.voted ? 'antiqueGold' : 'mist'}
      bg={shown.voted ? 'bubbleMine' : 'velvet'}
      aria-pressed={shown.voted}
      aria-label={`Upvote, ${shown.votes} ${shown.votes === 1 ? 'vote' : 'votes'}${shown.voted ? ', you voted' : ''}`}
      onClick={() => {
        if (inFlight.current) return
        inFlight.current = true
        startTransition(async () => {
          flip(undefined)
          try {
            await toggleVoteAction(itemId)
          } finally {
            inFlight.current = false
          }
        })
      }}
    >
      <span aria-hidden>▲</span>
      <span aria-hidden>{shown.votes}</span>
      {shown.voted && (
        <span aria-hidden style={{ fontSize: '10px' }}>
          voted
        </span>
      )}
    </Button>
  )
}
