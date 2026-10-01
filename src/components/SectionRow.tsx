import NextLink from 'next/link'
import { Link, ListItem, Text } from '@chakra-ui/react'
import { chapterRangeName, sectionDisplayName } from '@/lib/chapters'
import type { SectionSummary } from '@/lib/sections'
import { SectionActivity } from '@/components/SectionActivity'

export function SectionRow({ section }: { section: SectionSummary }) {
  if (section.status === 'locked') {
    const toGo = section.chaptersToGo
    return (
      <ListItem borderWidth="1px" borderStyle="dashed" borderColor="borderMuted" bg="sealed" borderRadius="lg" p={4}>
        <Text color="mist" fontFamily="heading" fontStyle="italic" fontWeight={600} fontSize="xl">
          {chapterRangeName(section.startChapter, section.endChapter)} · Sealed
        </Text>
        <Text fontSize="sm" color="mist">
          Opens after chapter {section.endChapter}, {toGo} chapter{toGo === 1 ? '' : 's'} to go
        </Text>
      </ListItem>
    )
  }

  return (
    <ListItem borderWidth="1px" borderColor="borderOpen" bg="mulberry" borderRadius="lg" p={4}>
      <Link
        as={NextLink}
        href={`/sections/${section.id}`}
        color="parchment"
        fontFamily="heading"
        fontWeight={600}
        fontSize="xl"
        _hover={{ color: 'antiqueGold', textDecoration: 'none' }}
      >
        Discuss {sectionDisplayName(section)}
      </Link>
      <SectionActivity postCount={section.postCount} lastPostAt={section.lastPostAt} />
    </ListItem>
  )
}
