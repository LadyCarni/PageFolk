import NextLink from 'next/link'
import { Box, Flex, Heading, HStack, Link, Text, VStack } from '@chakra-ui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faShield } from '@awesome.me/kit-729f370433/icons/classic/light'
import { chapterRangeName } from '@/lib/chapters'
import { STARTER_PROMPTS } from '@/lib/prompts'
import type { ThreadResult } from '@/lib/sections'
import { createPostAction } from '@/app/sections/actions'
import { MessagesScroller } from '@/components/MessagesScroller'
import { NoteComposer } from '@/components/NoteComposer'
import { NoteItem } from '@/components/NoteItem'

type OpenThread = Extract<ThreadResult, { status: 'unlocked' }>

function SafeGroundPill({ endChapter }: { endChapter: number }) {
  return (
    <HStack
      as="span"
      display="inline-flex"
      spacing={2}
      mt={3}
      px={3}
      py={1}
      borderWidth="1px"
      borderColor="borderMuted"
      borderRadius="full"
    >
      <Box as="span" aria-hidden color="mist">
        <FontAwesomeIcon icon={faShield} />
      </Box>
      <Text as="span" fontSize="sm" color="parchment">
        Safe ground: nothing past chapter {endChapter}
      </Text>
    </HStack>
  )
}

export function ThreadPane({
  thread,
  sectionId,
  viewerId,
  backHref,
}: {
  thread: OpenThread
  sectionId: string
  viewerId: string
  backHref: string
}) {
  const topLevel = thread.posts.filter((post) => !post.parentPostId)
  const repliesTo = (postId: string) => thread.posts.filter((post) => post.parentPostId === postId)
  const range = chapterRangeName(thread.startChapter, thread.endChapter)
  const title = thread.title?.trim() || null

  return (
    <Flex direction="column" h="100%" minH={0}>
      <Box px={{ base: 4, md: 8 }} pt={6} pb={4} borderBottomWidth="1px" borderColor="divider">
        <Link as={NextLink} href={backHref} display={{ base: 'inline-block', lg: 'none' }} mb={3} fontSize="sm">
          ← Back to conversations
        </Link>
        {title && (
          <Text fontSize="xs" letterSpacing="0.14em" textTransform="uppercase" color="antiqueGold">
            {range}
          </Text>
        )}
        <Heading as="h2" size="xl" mt={1}>
          {title ?? range}
        </Heading>
        <SafeGroundPill endChapter={thread.endChapter} />
      </Box>

      <MessagesScroller scrollKey={`${sectionId}:${topLevel.length}`}>
        {topLevel.length === 0 ? (
          <Text color="mist" fontStyle="italic">
            No notes yet. Start the conversation below.
          </Text>
        ) : (
          <VStack as="ul" align="stretch" spacing={6} p={0} m={0} listStyleType="none">
            {topLevel.map((note) => (
              <Box as="li" key={note.id}>
                <NoteItem note={note} replies={repliesTo(note.id)} viewerId={viewerId} sectionId={sectionId} />
              </Box>
            ))}
          </VStack>
        )}
      </MessagesScroller>

      <Box px={{ base: 4, md: 8 }} py={4} borderTopWidth="1px" borderColor="divider">
        <NoteComposer
          variant="bar"
          action={createPostAction.bind(null, sectionId)}
          placeholder="Start a new note"
          starters={STARTER_PROMPTS}
        />
      </Box>
    </Flex>
  )
}
