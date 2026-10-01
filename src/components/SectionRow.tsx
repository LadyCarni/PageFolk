import NextLink from 'next/link'
import { Link, ListItem, Text } from '@chakra-ui/react'
import { chapterRangeName, sectionDisplayName } from '@/lib/chapters'
import type { SectionSummary } from '@/lib/sections'
import { SectionActivity } from '@/components/SectionActivity'

export function SectionRow({ section }: { section: SectionSummary }) {
  if (section.status === 'locked') {
    const toGo = section.chaptersToGo
    return (
      <ListItem borderWidth="1px" borderStyle="dashed" borderColor="brand.500" borderRadius="md" p={3}>
        <Text color="brand.700" fontWeight={500} fontSize="lg">
          {chapterRangeName(section.startChapter, section.endChapter)} · Sealed
        </Text>
        <Text fontSize="sm" color="gray.600">
          Opens after chapter {section.endChapter}, {toGo} chapter{toGo === 1 ? '' : 's'} to go
        </Text>
      </ListItem>
    )
  }

  return (
    <ListItem borderWidth="1px" borderColor="brand.500" bg="brand.50" borderRadius="md" p={3}>
      <Link as={NextLink} href={`/sections/${section.id}`} color="brand.700" fontWeight={500} fontSize="lg">
        Discuss {sectionDisplayName(section)}
      </Link>
      <SectionActivity postCount={section.postCount} lastPostAt={section.lastPostAt} />
    </ListItem>
  )
}
