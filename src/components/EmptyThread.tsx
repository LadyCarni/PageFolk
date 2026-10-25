'use client'

import { Box, Text } from '@chakra-ui/react'

const POINTER_QUERY = '@media (hover: hover) and (pointer: fine)'

// Fills the notes area of a thread with no notes yet. Tapping or clicking anywhere in it puts the
// cursor in the note box, so on a phone the whole empty space starts the conversation.
export function EmptyThread({ composerId }: { composerId: string }) {
  return (
    <Box
      flex="1"
      minH={0}
      px={{ base: 4, md: 8 }}
      py={6}
      cursor="text"
      onClick={() => document.getElementById(composerId)?.focus()}
    >
      <Text color="mist" fontStyle="italic">
        No notes yet.{' '}
        <Box as="span" sx={{ [POINTER_QUERY]: { display: 'none' } }}>
          Tap anywhere to start the conversation.
        </Box>
        <Box as="span" display="none" sx={{ [POINTER_QUERY]: { display: 'inline' } }}>
          Click anywhere to start the conversation.
        </Box>
      </Text>
    </Box>
  )
}
