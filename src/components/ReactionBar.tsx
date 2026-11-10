'use client'

import { startTransition, useOptimistic } from 'react'
import { Box, Button, HStack } from '@chakra-ui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFaceLaughSquint, faFaceFrown, faHeart, type IconDefinition } from '@fortawesome/free-solid-svg-icons'
import { toggleReactionAction } from '@/app/sections/actions'
import { REACTIONS, type ReactionKind, type ReactionSummary } from '@/lib/reactions'

const ICONS: Record<ReactionKind, { icon: IconDefinition; label: string }> = {
  laugh: { icon: faFaceLaughSquint, label: 'Laugh' },
  heart: { icon: faHeart, label: 'Heart' },
  cry: { icon: faFaceFrown, label: 'Sad' },
}

const CIRCLE_PX = 34
const GAP_PX = 6
// Room the row under a bubble leaves on its right so its links never run under the circles.
export const REACTIONS_CLEARANCE = `${REACTIONS.length * CIRCLE_PX + (REACTIONS.length - 1) * GAP_PX + 16}px`

// Laugh, heart and cry as circles. Each is its own toggle; the tap shows at once and the server catches up.
export function ReactionBar({ postId, reactions }: { postId: string; reactions: ReactionSummary }) {
  const [shown, flip] = useOptimistic(reactions, (current, kind: ReactionKind) => {
    const { count, mine } = current[kind]
    return { ...current, [kind]: { count: count + (mine ? -1 : 1), mine: !mine } }
  })

  return (
    <HStack spacing={`${GAP_PX}px`}>
      {REACTIONS.map((kind) => {
        const { count, mine } = shown[kind]
        const { icon, label } = ICONS[kind]
        return (
          <Button
            key={kind}
            position="relative"
            boxSize={`${CIRCLE_PX}px`}
            minW={`${CIRCLE_PX}px`}
            p={0}
            borderRadius="full"
            borderWidth="1px"
            borderColor={mine ? 'antiqueGold' : 'border'}
            bg={mine ? 'bubbleMine' : 'velvet'}
            color={mine ? 'antiqueGold' : 'mist'}
            fontSize="md"
            _hover={{ bg: 'mulberry', color: mine ? 'antiqueGold' : 'parchment' }}
            _active={{ bg: 'mulberry' }}
            aria-pressed={mine}
            aria-label={`${label}${count ? `, ${count}` : ''}`}
            title={label}
            onClick={() =>
              startTransition(async () => {
                flip(kind)
                await toggleReactionAction(postId, kind)
              })
            }
          >
            <FontAwesomeIcon icon={icon} />
            {count > 0 && (
              <Box
                as="span"
                position="absolute"
                top="-6px"
                right="-6px"
                minW="18px"
                h="18px"
                px="5px"
                borderRadius="full"
                bg={mine ? 'antiqueGold' : 'borderMuted'}
                color={mine ? 'onGold' : 'parchment'}
                fontSize="11px"
                fontWeight={700}
                lineHeight="18px"
                textAlign="center"
              >
                {count}
              </Box>
            )}
          </Button>
        )
      })}
    </HStack>
  )
}
