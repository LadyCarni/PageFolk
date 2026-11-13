import NextLink from 'next/link'
import { Flex, Link } from '@chakra-ui/react'
import { longListPath, type LongListSort } from '@/lib/long-list-view'

const SORTS: { value: LongListSort; label: string }[] = [
  { value: 'votes', label: 'Most liked' },
  { value: 'newest', label: 'Newest' },
  { value: 'az', label: 'A–Z' },
]

// Each link keeps the genre filter and drops ?book= so the panel shows the first book of the new order.
export function SortPills({ sort, genre }: { sort: LongListSort; genre: string | null }) {
  return (
    <Flex as="nav" aria-label="Sort the Long List" gap={2} wrap="wrap">
      {SORTS.map(({ value, label }) => {
        const active = value === sort
        return (
          <Link
            key={value}
            as={NextLink}
            href={longListPath({ sort: value, genre })}
            aria-current={active ? 'true' : undefined}
            px={4}
            py={1}
            borderRadius="full"
            borderWidth="1px"
            borderColor={active ? 'antiqueGold' : 'border'}
            bg={active ? 'antiqueGold' : 'transparent'}
            color={active ? 'onGold' : 'mist'}
            fontSize="sm"
            _hover={{ textDecoration: 'none' }}
          >
            {label}
          </Link>
        )
      })}
    </Flex>
  )
}
