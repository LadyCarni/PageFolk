import { Box, Flex, Text } from '@chakra-ui/react'
import type { PostWithAuthor } from '@/lib/sections'
import { createPostAction, deletePostAction } from '@/app/sections/actions'
import { DeletePostButton } from '@/components/DeletePostButton'
import { NoteActions } from '@/components/NoteActions'
import { PostTimestamp } from '@/components/PostTimestamp'
import { UserAvatar } from '@/components/UserAvatar'

function Bubble({ post, mine }: { post: PostWithAuthor; mine: boolean }) {
  return (
    <Box bg={mine ? 'bubbleMine' : 'bubbleOther'} borderWidth="1px" borderColor="border" borderRadius="xl" px={4} py={3}>
      <Flex justify="space-between" align="baseline" gap={3}>
        <Text fontSize="sm" fontWeight={600} color="dustyRose">
          {post.user.name ?? 'Member'}
        </Text>
        <PostTimestamp createdAt={post.createdAt} />
      </Flex>
      <Text mt={1} whiteSpace="pre-wrap">
        {post.body}
      </Text>
    </Box>
  )
}

// One top-level note: avatar outside the bubble, then its actions and its replies.
export function NoteItem({
  note,
  replies,
  viewerId,
  sectionId,
}: {
  note: PostWithAuthor
  replies: PostWithAuthor[]
  viewerId: string
  sectionId: string
}) {
  const mine = note.user.id === viewerId

  return (
    <Flex gap={3} align="flex-start">
      <UserAvatar user={note.user} />
      <Box flex="1" minW={0}>
        <Bubble post={note} mine={mine} />
        <NoteActions
          replyAction={createPostAction.bind(null, sectionId)}
          parentPostId={note.id}
          replyCount={replies.length}
          deleteSlot={
            mine ? (
              <DeletePostButton
                replyCount={replies.length}
                action={deletePostAction.bind(null, sectionId, note.id)}
              />
            ) : null
          }
        >
          {replies.map((reply) => {
            const replyMine = reply.user.id === viewerId
            return (
              <Flex key={reply.id} gap={3} align="flex-start" mt={3} ml={{ base: 0, md: 4 }}>
                <UserAvatar user={reply.user} size={30} />
                <Box flex="1" minW={0}>
                  <Bubble post={reply} mine={replyMine} />
                  {replyMine && (
                    <Box mt={1} px={1}>
                      <DeletePostButton replyCount={0} action={deletePostAction.bind(null, sectionId, reply.id)} />
                    </Box>
                  )}
                </Box>
              </Flex>
            )
          })}
        </NoteActions>
      </Box>
    </Flex>
  )
}
