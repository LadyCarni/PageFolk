import { notFound } from 'next/navigation'
import { Box, Heading, List, ListItem, Text, VStack } from '@chakra-ui/react'
import { requireUser } from '@/lib/session'
import { getSectionThread } from '@/lib/sections'
import { PostForm } from '@/components/PostForm'
import { createPostAction } from '../actions'

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
    <VStack align="stretch" maxW="2xl" mx="auto" p={8} spacing={6}>
      <Heading size="lg" color="brand.900">
        {thread.label}
      </Heading>

      <PostForm action={createPostAction.bind(null, params.sectionId)} />

      <List spacing={4}>
        {topLevel.map((post) => (
          <ListItem key={post.id} borderWidth="1px" borderRadius="md" p={3}>
            <Text fontSize="sm" color="brand.500">
              {post.user.name ?? 'Member'}
            </Text>
            <Text>{post.body}</Text>
            <List mt={2} ml={4} spacing={2} borderLeftWidth="2px" borderColor="brand.100" pl={4}>
              {repliesTo(post.id).map((reply) => (
                <ListItem key={reply.id}>
                  <Text fontSize="sm" color="brand.500">
                    {reply.user.name ?? 'Member'}
                  </Text>
                  <Text>{reply.body}</Text>
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
