import { Box, Flex, Heading, Text } from '@chakra-ui/react'
import { requireUser } from '@/lib/session'
import { listLongList } from '@/lib/long-list'
import { filteredSummary, genresOnList, longListSummary, parseGenre, parseSort } from '@/lib/long-list-view'
import { LongListBrowser } from '@/components/long-list/LongListBrowser'
import { SuggestButton } from '@/components/long-list/SuggestButton'
import { SortPills } from '@/components/long-list/SortPills'
import { GenreSelect } from '@/components/long-list/GenreSelect'

export default async function LongListPage({
  searchParams,
}: {
  searchParams: { sort?: string | string[]; genre?: string | string[] }
}) {
  const user = await requireUser()
  const sort = parseSort(searchParams.sort)
  const allBooks = await listLongList({ id: user.id, isAdmin: user.isAdmin }, sort)
  const genres = genresOnList(allBooks)
  const genre = parseGenre(searchParams.genre, genres)
  const books = genre ? allBooks.filter((book) => book.genre === genre) : allBooks

  if (allBooks.length === 0) {
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
      key={`${sort}|${genre ?? ''}`}
      books={books}
      sort={sort}
      genre={genre}
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
            {genre ? filteredSummary(books.length, allBooks.length, genre) : longListSummary(allBooks.length)}
          </Text>
          <Flex mt={5} gap={3} align="center" justify="space-between" wrap="wrap">
            <SortPills sort={sort} genre={genre} />
            {genres.length > 0 && <GenreSelect genres={genres} genre={genre} sort={sort} />}
          </Flex>
        </>
      }
    />
  )
}
