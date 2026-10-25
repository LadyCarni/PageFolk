'use client'

import NextLink from 'next/link'
import { Box, Button, Flex, Heading, HStack, Link, Text, VStack } from '@chakra-ui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRight, faChevronRight, faLock } from '@fortawesome/free-solid-svg-icons'
import { CoverImage } from '@/components/CoverImage'
import { chapterRangeName } from '@/lib/chapters'
import { formatReadMonth } from '@/lib/read-month'
import { conversationsSubline, plural, sealedLabel, statusLabel, type ShelfBook } from '@/lib/shelf-view'
import type { SectionSummary } from '@/lib/sections'

const LABEL_PROPS = { fontSize: 'xs', letterSpacing: '0.14em', textTransform: 'uppercase' } as const

// A preview of one past book. Everything in it leads to the full three-pane book page.
export function ShelfPreview({ book }: { book: ShelfBook }) {
  const href = `/shelf/${book.id}`

  return (
    <VStack align="stretch" spacing={7} p={10}>
      <Flex gap={6} align="flex-start">
        {/* The title link below is the accessible way in, so the cover link is skipped by keyboard and screen readers. */}
        <Link as={NextLink} href={href} flexShrink={0} tabIndex={-1} aria-hidden>
          <CoverImage book={book} coverVersion={book.coverVersion} width="150px" />
        </Link>
        <Box minW={0}>
          {book.readMonth && (
            <Text {...LABEL_PROPS} color="dustyRose">
              Read in {formatReadMonth(book.readMonth)}
            </Text>
          )}
          <Heading as="h2" size="xl" mt={1} aria-live="polite">
            <Link as={NextLink} href={href} color="parchment">
              {book.title}
            </Link>
          </Heading>
          <Text fontFamily="heading" fontStyle="italic" fontSize="lg" color="mist" mt={1}>
            {book.author}
          </Text>
          {book.genre && (
            <Text {...LABEL_PROPS} color="antiqueGold" mt={2}>
              {book.genre}
            </Text>
          )}
          <Box
            as="span"
            display="inline-block"
            mt={3}
            px={3}
            py={1}
            borderRadius="full"
            borderWidth="1px"
            borderColor="dustyRose"
            bg="bubbleMine"
            color="parchment"
            fontSize="sm"
          >
            {statusLabel(book)}
          </Box>
        </Box>
      </Flex>

      <Button
        as={NextLink}
        href={href}
        variant="goldOutline"
        alignSelf="flex-start"
        px={6}
        rightIcon={<FontAwesomeIcon icon={faArrowRight} />}
      >
        Open the full book
      </Button>

      {book.blurb && <Text whiteSpace="pre-wrap">{book.blurb}</Text>}

      <HStack spacing={8} wrap="wrap">
        {[
          plural(book.totalChapters, 'chapter'),
          plural(book.sections.length, 'conversation'),
          plural(book.openNotes, 'note'),
        ].map((stat) => {
          const [count, ...rest] = stat.split(' ')
          return (
            <Text key={stat} color="mist">
              <Text as="span" fontFamily="heading" fontSize="3xl" color="antiqueGold" mr={2}>
                {count}
              </Text>
              {rest.join(' ')}
            </Text>
          )
        })}
      </HStack>

      <Box>
        <Heading as="h3" size="lg">
          Past conversations
        </Heading>
        <Text color="mist" mt={1}>
          {conversationsSubline(book)}
        </Text>
        {book.sections.length === 0 ? (
          <Text color="mist" mt={4}>
            No conversations were set up for this book.
          </Text>
        ) : (
          <VStack as="ul" align="stretch" spacing={3} mt={5} mb={0} mx={0} p={0} listStyleType="none">
            {book.sections.map((section) => (
              <PreviewRow key={section.id} section={section} href={href} />
            ))}
          </VStack>
        )}
      </Box>
    </VStack>
  )
}

function PreviewRow({ section, href }: { section: SectionSummary; href: string }) {
  const range = chapterRangeName(section.startChapter, section.endChapter)
  const locked = section.status === 'locked'
  const title = locked ? null : section.title?.trim() || null

  return (
    <Box as="li" listStyleType="none">
      <Link
        as={NextLink}
        href={locked ? href : `${href}?thread=${encodeURIComponent(section.id)}`}
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        gap={3}
        px={5}
        py={4}
        bg={locked ? 'sealed' : 'mulberry'}
        borderWidth="1px"
        borderStyle={locked ? 'dashed' : 'solid'}
        borderColor={locked ? 'borderMuted' : 'borderOpen'}
        borderRadius="xl"
        _hover={{ borderColor: 'antiqueGold', textDecoration: 'none' }}
      >
        <Box minW={0}>
          <Text {...LABEL_PROPS} color={locked ? 'mist' : 'antiqueGold'}>
            {title ?? range}
          </Text>
          <Text fontSize="sm" color="mist" mt={1}>
            {section.status === 'locked' ? sealedLabel(section.chaptersToGo) : plural(section.postCount, 'note')}
          </Text>
        </Box>
        <Box aria-hidden color={locked ? 'mist' : 'antiqueGold'} flexShrink={0}>
          <FontAwesomeIcon icon={locked ? faLock : faChevronRight} />
        </Box>
      </Link>
    </Box>
  )
}
