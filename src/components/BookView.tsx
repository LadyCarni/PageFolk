import { Box, Flex, Grid, Heading, Text } from '@chakra-ui/react'
import { NAV_HEIGHT_PX } from '@/lib/layout'
import type { BookViewData } from '@/lib/book-view'
import { BookPanel } from '@/components/BookPanel'
import { ThreadList } from '@/components/ThreadList'
import { ThreadPane } from '@/components/ThreadPane'

// The three panes for one book. On large screens they sit side by side and scroll on their own;
// on small screens one shows at a time: the book and thread list until a thread is explicitly
// chosen, then the thread.
export function BookView({
  data,
  viewerId,
  basePath,
  label,
}: {
  data: BookViewData
  viewerId: string
  basePath: string
  label: string
}) {
  const { sections, selectedId, explicit, thread } = data
  const fullHeight = `calc(100dvh - ${NAV_HEIGHT_PX}px)`

  return (
    <Grid templateColumns={{ base: '1fr', lg: '1fr 1.15fr 1.8fr' }} h={{ lg: fullHeight }} minH={{ base: fullHeight }}>
      <Box
        as="aside"
        aria-label="Book"
        display={{ base: explicit ? 'none' : 'block', lg: 'block' }}
        overflowY={{ lg: 'auto' }}
        minH={0}
      >
        <BookPanel data={data} label={label} />
      </Box>
      <Box
        as="nav"
        aria-label="Conversations"
        display={{ base: explicit ? 'none' : 'block', lg: 'block' }}
        overflowY={{ lg: 'auto' }}
        minH={0}
        borderLeftWidth={{ lg: '1px' }}
        borderColor="divider"
      >
        <ThreadList sections={sections} selectedId={selectedId} basePath={basePath} />
      </Box>
      <Box
        as="main"
        display={{ base: explicit ? 'block' : 'none', lg: 'block' }}
        bg="panel"
        borderLeftWidth={{ lg: '1px' }}
        borderColor="divider"
        minH={0}
        h={{ base: fullHeight, lg: '100%' }}
      >
        {thread && selectedId ? (
          <ThreadPane thread={thread} sectionId={selectedId} viewerId={viewerId} backHref={basePath} />
        ) : (
          <Flex h="100%" align="center" justify="center" direction="column" textAlign="center" p={8} gap={2}>
            <Heading as="h2" size="lg" fontStyle="italic" color="mist">
              Pick a conversation to read the notes.
            </Heading>
            <Text color="mist">Threads open as you move your place in the book forward.</Text>
          </Flex>
        )}
      </Box>
    </Grid>
  )
}
