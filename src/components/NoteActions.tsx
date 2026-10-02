'use client'

import { useState, type ReactNode } from 'react'
import { Box, Button, HStack } from '@chakra-ui/react'
import { NoteComposer } from '@/components/NoteComposer'

// The row under a note (Reply, Hide/Show replies, Delete) plus the replies themselves, which
// are rendered by the server and passed in as children so they can be toggled here.
export function NoteActions({
  replyAction,
  parentPostId,
  replyCount,
  deleteSlot,
  children,
}: {
  replyAction: (formData: FormData) => Promise<void>
  parentPostId: string
  replyCount: number
  deleteSlot?: ReactNode
  children?: ReactNode
}) {
  const [replying, setReplying] = useState(false)
  const [showReplies, setShowReplies] = useState(true)

  return (
    <>
      <HStack spacing={4} mt={1} px={1}>
        <Button variant="link" size="sm" aria-expanded={replying} onClick={() => setReplying((open) => !open)}>
          Reply
        </Button>
        {replyCount > 0 && (
          <Button variant="link" size="sm" aria-expanded={showReplies} onClick={() => setShowReplies((show) => !show)}>
            {showReplies ? 'Hide replies' : `Show replies (${replyCount})`}
          </Button>
        )}
        {deleteSlot}
      </HStack>
      {replying && (
        <Box mt={2}>
          <NoteComposer
            variant="inline"
            action={replyAction}
            parentPostId={parentPostId}
            placeholder="Reply…"
            onSent={() => setReplying(false)}
          />
        </Box>
      )}
      {showReplies && children}
    </>
  )
}
