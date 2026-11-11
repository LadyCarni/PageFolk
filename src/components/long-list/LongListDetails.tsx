import type { ReactNode } from 'react'
import { Box, Flex, Heading, Text, VStack, Wrap, WrapItem } from '@chakra-ui/react'
import { UserAvatar } from '@/components/UserAvatar'
import { coverColor } from '@/lib/cover-color'
import { voteLabel, type LongListEntry } from '@/lib/long-list-view'
import { GenrePill } from './LongListRow'
import { LongListVoteButton } from './LongListVoteButton'

const LABEL_PROPS = { fontSize: 'xs', letterSpacing: '0.14em', textTransform: 'uppercase' } as const

export function LongListDetails({
  book,
  viewerId,
  isAdmin: _isAdmin,
  actions,
}: {
  book: LongListEntry
  viewerId: string
  isAdmin: boolean
  actions?: ReactNode
}) {
  const date = book.createdAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const by = book.suggestedBy.id === viewerId ? 'you' : (book.suggestedBy.name ?? 'a member')

  return (
    <VStack align="stretch" spacing={6} p={{ base: 6, lg: 10 }}>
      <Flex gap={6} align="flex-start">
        <Box aria-hidden flexShrink={0} w="120px" aspectRatio="2 / 3" borderRadius="md" bg={coverColor(book.id)} />
        <Box minW={0}>
          <Heading as="h2" size="xl" color="parchment">
            {book.title}
          </Heading>
          <Text fontFamily="heading" fontStyle="italic" fontSize="lg" color="mist" mt={1}>
            {book.author}
          </Text>
          {book.genre && (
            <Box mt={2}>
              <GenrePill genre={book.genre} />
            </Box>
          )}
          <Text fontSize="sm" color="mist" mt={3}>
            Suggested by {by} · {date}
          </Text>
        </Box>
      </Flex>
      <LongListVoteButton bookId={book.id} votes={book.votes} voted={book.voted} />
      <Text color="parchment">{book.synopsis}</Text>
      <Box>
        <Text {...LABEL_PROPS} color="mist">
          {voteLabel(book.votes)}
        </Text>
        {book.voters.length > 0 && (
          <Wrap as="ul" spacing={2} mt={2} m={0} p={0} listStyleType="none">
            {book.voters.map((voter) => (
              <WrapItem as="li" key={voter.id}>
                <Flex
                  align="center"
                  gap={2}
                  pl={1}
                  pr={3}
                  py={1}
                  borderRadius="full"
                  borderWidth="1px"
                  borderColor="border"
                  fontSize="sm"
                >
                  <UserAvatar user={voter} size={18} />
                  {voter.id === viewerId ? 'You' : (voter.name ?? 'Member')}
                </Flex>
              </WrapItem>
            ))}
          </Wrap>
        )}
      </Box>
      {actions && <Flex gap={3} wrap="wrap">{actions}</Flex>}
    </VStack>
  )
}
