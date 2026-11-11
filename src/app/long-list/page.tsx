import { Box, Flex, Heading, Text } from '@chakra-ui/react'
import { requireUser } from '@/lib/session'
import { listLongList } from '@/lib/long-list'
import { longListSummary, parseSort } from '@/lib/long-list-view'
import { LongListBrowser } from '@/components/long-list/LongListBrowser'
import { SuggestButton } from '@/components/long-list/SuggestButton'
import { SortPills } from '@/components/long-list/SortPills'

export default async function LongListPage({ searchParams }: { searchParams: { sort?: string | string[] } }) {
  const user = await requireUser()
  const sort = parseSort(searchParams.sort)
  const books = await listLongList({ id: user.id, isAdmin: user.isAdmin }, sort)

  if (books.length === 0) {
    return (
      <Box as="main" p={{ base: 6, md: 10 }}>
        <Flex justify="space-between" align="center" gap={3}>
          <Heading as="h1" size="2xl">
            The Long List
          </Heading>
          <SuggestButton />
        </Flex>
        <Text mt={2} color="mist">
          {longListSummary(0)}
        </Text>
        <Text mt={4} color="mist">
          Know a book the club should read? Be the first to suggest one.
        </Text>
      </Box>
    )
  }

  return (
    <LongListBrowser
      key={sort}
      books={books}
      sort={sort}
      viewerId={user.id}
      isAdmin={user.isAdmin}
      header={
        <>
          <Flex justify="space-between" align="center" gap={3}>
            <Heading as="h1" size="2xl">
              The Long List
            </Heading>
            <SuggestButton />
          </Flex>
          <Text mt={2} color="mist">
            {longListSummary(books.length)}
          </Text>
          <Flex mt={5}>
            <SortPills sort={sort} />
          </Flex>
        </>
      }
    />
  )
}
