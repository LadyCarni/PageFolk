import NextLink from 'next/link'
import { Box, Flex, Link, Text } from '@chakra-ui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronRight, faLock } from '@fortawesome/free-solid-svg-icons'
import { chapterRangeName } from '@/lib/chapters'
import type { SectionSummary } from '@/lib/sections'

const LABEL_PROPS = { fontSize: 'xs', letterSpacing: '0.14em', textTransform: 'uppercase' } as const

// Three states: sealed, unlocked regular, and unlocked active (the selected thread).
export function ThreadCard({
  section,
  active,
  basePath,
}: {
  section: SectionSummary
  active: boolean
  basePath: string
}) {
  const range = chapterRangeName(section.startChapter, section.endChapter)

  if (section.status === 'locked') {
    const toGo = section.chaptersToGo
    return (
      <Flex
        as="li"
        listStyleType="none"
        gap={4}
        align="center"
        p={4}
        bg="sealed"
        borderWidth="1px"
        borderStyle="dashed"
        borderColor="borderMuted"
        borderRadius="xl"
      >
        <Flex
          aria-hidden
          flexShrink={0}
          boxSize="44px"
          borderRadius="full"
          borderWidth="1px"
          borderColor="borderMuted"
          align="center"
          justify="center"
          color="mist"
        >
          <FontAwesomeIcon icon={faLock} />
        </Flex>
        <Box>
          <Text {...LABEL_PROPS} color="mist">
            {range}
          </Text>
          <Text fontFamily="heading" fontStyle="italic" fontWeight={600} fontSize="xl" color="mist">
            Sealed
          </Text>
          <Text fontSize="sm" color="mist">
            Opens after chapter {section.endChapter}, {toGo} chapter{toGo === 1 ? '' : 's'} to go
          </Text>
        </Box>
      </Flex>
    )
  }

  const title = section.title?.trim() || null
  const notes = section.postCount

  return (
    <Box as="li" listStyleType="none">
      <Link
        as={NextLink}
        href={`${basePath}?thread=${encodeURIComponent(section.id)}`}
        scroll={false}
        aria-current={active ? 'true' : undefined}
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        gap={3}
        p={4}
        bg={active ? 'bubbleMine' : 'mulberry'}
        borderWidth="1px"
        borderColor={active ? 'antiqueGold' : 'borderOpen'}
        borderRadius="xl"
        color="parchment"
        _hover={{ borderColor: 'antiqueGold', textDecoration: 'none' }}
      >
        <Box minW={0}>
          {title && (
            <Text {...LABEL_PROPS} color="antiqueGold">
              {range}
            </Text>
          )}
          <Text fontFamily="heading" fontWeight={600} fontSize="2xl" lineHeight="1.2" color="parchment">
            {title ?? range}
          </Text>
          <Text fontSize="sm" color="mist" mt={1}>
            {notes} note{notes === 1 ? '' : 's'}
          </Text>
        </Box>
        <Box aria-hidden color="antiqueGold" flexShrink={0}>
          <FontAwesomeIcon icon={faChevronRight} />
        </Box>
      </Link>
    </Box>
  )
}
