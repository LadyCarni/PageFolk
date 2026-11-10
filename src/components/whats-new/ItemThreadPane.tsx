import NextLink from 'next/link'
import { Box, Flex, Heading, Link, Text, VStack } from '@chakra-ui/react'
import type { ItemThread, ThreadEntryView } from '@/lib/whats-new-view'
import { replyToItemAction } from '@/app/admin/feature-requests/actions'
import { MessagesScroller } from '@/components/MessagesScroller'
import { NoteComposer } from '@/components/NoteComposer'
import { PostTimestamp } from '@/components/PostTimestamp'
import { UserAvatar } from '@/components/UserAvatar'
import { MemberRequestBadge } from './MemberRequestBadge'
import { StatusLabel } from './StatusLabel'

function Bubble({ entry, mine, admin }: { entry: Extract<ThreadEntryView, { kind: 'original' | 'reply' }>; mine: boolean; admin: boolean }) {
  return (
    <Flex gap={3} align="flex-start">
      <UserAvatar user={entry.author} />
      <Box flex="1" minW={0} bg={mine ? 'bubbleMine' : 'bubbleOther'} borderWidth="1px" borderColor="border" borderRadius="xl" px={4} py={3}>
        <Flex justify="space-between" align="baseline" gap={3}>
          <Flex align="baseline" gap={2}>
            <Text fontSize="sm" fontWeight={600} color="dustyRose">
              {entry.author.name ?? 'Member'}
            </Text>
            {admin && (
              <Text as="span" fontSize="xs" px={2} borderWidth="1px" borderColor="antiqueGold" borderRadius="full" color="antiqueGold">
                Admin
              </Text>
            )}
          </Flex>
          <PostTimestamp createdAt={entry.at} />
        </Flex>
        {entry.kind === 'original' ? (
          <>
            <Text mt={1} fontWeight={600} color="parchment">
              {entry.title}
            </Text>
            {entry.description && (
              <Text mt={1} whiteSpace="pre-wrap">
                {entry.description}
              </Text>
            )}
          </>
        ) : (
          <Text mt={1} whiteSpace="pre-wrap">
            {entry.body}
          </Text>
        )}
      </Box>
    </Flex>
  )
}

export function ItemThreadPane({
  thread,
  viewer,
  backHref,
}: {
  thread: ItemThread
  viewer: { id: string; isAdmin: boolean }
  backHref: string
}) {
  return (
    <Flex direction="column" h="100%" minH={0}>
      <Box px={{ base: 4, md: 8 }} pt={6} pb={4} borderBottomWidth="1px" borderColor="divider">
        <Link as={NextLink} href={backHref} display={{ base: 'inline-block', lg: 'none' }} mb={3} fontSize="sm">
          ← Back to What&apos;s new
        </Link>
        <Heading as="h2" size="xl">
          {thread.title}
        </Heading>
        <Flex mt={2} gap={3} align="center" wrap="wrap">
          {thread.isMemberRequest && <MemberRequestBadge />}
          <StatusLabel status={thread.headerStatus} />
        </Flex>
      </Box>

      <MessagesScroller scrollKey={`${thread.id}:${thread.entries.length}`}>
        <VStack as="ul" align="stretch" spacing={4} p={0} m={0} listStyleType="none">
          {thread.entries.map((entry, i) => (
            <Box as="li" key={entry.kind === 'reply' ? entry.id : `${entry.kind}-${i}`}>
              {entry.kind === 'event' ? (
                <Text textAlign="center" fontSize="sm" color="mist">
                  {entry.text}
                </Text>
              ) : (
                <Bubble
                  entry={entry}
                  mine={entry.author.id === viewer.id}
                  admin={entry.kind === 'reply'}
                />
              )}
            </Box>
          ))}
        </VStack>
      </MessagesScroller>

      <Box px={{ base: 4, md: 8 }} py={4} borderTopWidth="1px" borderColor="divider">
        {viewer.isAdmin ? (
          <NoteComposer
            key={thread.id}
            variant="bar"
            action={replyToItemAction.bind(null, thread.id)}
            placeholder="Reply to this request"
          />
        ) : (
          <Text color="mist" textAlign="center">
            Only the admin replies here
          </Text>
        )}
      </Box>
    </Flex>
  )
}
