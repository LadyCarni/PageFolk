'use client'

import type { MouseEvent } from 'react'
import NextLink from 'next/link'
import { Box, Flex, LinkBox, LinkOverlay, Text } from '@chakra-ui/react'
import { CoverMark } from '@/components/CoverMark'
import type { LongListEntry } from '@/lib/long-list-view'
import { LongListVoteButton } from './LongListVoteButton'

export function GenrePill({ genre }: { genre: string }) {
  return (
    <Box
      as="span"
      px={2}
      borderRadius="full"
      borderWidth="1px"
      borderColor="border"
      color="dustyRose"
      fontSize="xs"
      whiteSpace="nowrap"
    >
      {genre}
    </Box>
  )
}

export function LongListRow({
  book,
  selected,
  onSelect,
}: {
  book: LongListEntry
  selected: boolean
  onSelect: (event: MouseEvent<HTMLAnchorElement>, id: string) => void
}) {
  return (
    <LinkBox
      as="li"
      display="flex"
      alignItems="center"
      gap={4}
      px={4}
      py={3}
      borderRadius="lg"
      bg={selected ? { base: 'transparent', lg: 'bubbleMine' } : 'transparent'}
      _hover={{ bg: 'bubbleMine' }}
    >
      <CoverMark id={book.id} width={34} diamond={5} />
      <Box flex={1} minW={0}>
        <Flex align="baseline" columnGap={2} rowGap={1} wrap="wrap">
          <LinkOverlay
            as={NextLink}
            href={`/long-list/${book.id}`}
            onClick={(event: MouseEvent<HTMLAnchorElement>) => onSelect(event, book.id)}
            aria-current={selected ? 'true' : undefined}
            color="parchment"
            fontFamily="heading"
            fontWeight="semibold"
            fontSize="xl"
            lineHeight="short"
            _hover={{ textDecoration: 'none' }}
          >
            {book.title}
          </LinkOverlay>
          <Text as="span" color="mist" fontSize="sm">
            by {book.author}
          </Text>
          {book.genre && <GenrePill genre={book.genre} />}
        </Flex>
        <Text noOfLines={1} fontSize="sm" color="mist" mt={1}>
          {book.synopsis}
        </Text>
      </Box>
      <Box position="relative" zIndex={1}>
        <LongListVoteButton bookId={book.id} votes={book.votes} voted={book.voted} />
      </Box>
    </LinkBox>
  )
}
