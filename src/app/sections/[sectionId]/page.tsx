import { notFound } from 'next/navigation'
import { Box, Flex, Heading, HStack, List, ListItem, Text, VStack } from '@chakra-ui/react'
import { requireUser } from '@/lib/session'
import { getSectionThread } from '@/lib/sections'
import { PostForm } from '@/components/PostForm'
import { UserAvatar } from '@/components/UserAvatar'
import { PostTimestamp } from '@/components/PostTimestamp'
import { DeletePostButton } from '@/components/DeletePostButton'
import { createPostAction, deletePostAction } from '../actions'

export default async function SectionThreadPage({ params }: { params: { sectionId: string } }) {
  const user = await requireUser()

  let thread
  try {
    thread = await getSectionThread(params.sectionId, user.id)
  } catch {
    notFound()
  }

  if (thread.status === 'locked') {
    notFound()
  }

  const topLevel = thread.posts.filter((p) => !p.parentPostId)
  const repliesTo = (postId: string) => thread.posts.filter((p) => p.parentPostId === postId)

  return (
    <VStack align="stretch" p={8} spacing={6}>
      <Heading size="lg" color="brand.900">
        {thread.label}
      </Heading>

      <PostForm action={createPostAction.bind(null, params.sectionId)} />

      <List spacing={4}>
        {topLevel.map((post) => (
          <ListItem key={post.id} borderWidth="1px" borderColor="#e7b7a6" borderRadius="md" p={3}>
            <Flex justify="space-between" align="center">
              <HStack spacing={2}>
                <UserAvatar user={post.user} />
                <Text fontSize="sm" color="brand.500">
                  {post.user.name ?? 'Member'}
                </Text>
              </HStack>
              <PostTimestamp createdAt={post.createdAt} />
            </Flex>
            <Text>{post.body}</Text>
            {post.user.id === user.id && (
              <DeletePostButton
                replyCount={repliesTo(post.id).length}
                action={deletePostAction.bind(null, params.sectionId, post.id)}
              />
            )}
            <List mt={2} ml={4} spacing={2} borderLeftWidth="2px" borderColor="#e7b7a6" pl={4}>
              {repliesTo(post.id).map((reply) => (
                <ListItem key={reply.id}>
                  <Flex justify="space-between" align="center">
                    <HStack spacing={2}>
                      <UserAvatar user={reply.user} size={26} />
                      <Text fontSize="sm" color="brand.500">
                        {reply.user.name ?? 'Member'}
                      </Text>
                    </HStack>
                    <PostTimestamp createdAt={reply.createdAt} />
                  </Flex>
                  <Text>{reply.body}</Text>
                  {reply.user.id === user.id && (
                    <DeletePostButton
                      replyCount={0}
                      action={deletePostAction.bind(null, params.sectionId, reply.id)}
                    />
                  )}
                </ListItem>
              ))}
            </List>
            <Box mt={2} ml={4}>
              <PostForm
                action={createPostAction.bind(null, params.sectionId)}
                parentPostId={post.id}
                placeholder="Reply…"
              />
            </Box>
          </ListItem>
        ))}
      </List>
    </VStack>
  )
}
