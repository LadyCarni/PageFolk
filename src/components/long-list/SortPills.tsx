import NextLink from 'next/link'
import { Flex, Link } from '@chakra-ui/react'
import type { LongListSort } from '@/lib/long-list-view'

const SORTS: { value: LongListSort; label: string }[] = [
  { value: 'votes', label: 'Most votes' },
  { value: 'newest', label: 'Newest' },
  { value: 'az', label: 'A–Z' },
]

// Each link drops ?book= so the panel shows the first book of the new order.
export function SortPills({ sort }: { sort: LongListSort }) {
  return (
    <Flex as="nav" aria-label="Sort the Long List" gap={2} wrap="wrap">
      {SORTS.map(({ value, label }) => {
        const active = value === sort
        return (
          <Link
            key={value}
            as={NextLink}
            href={`/long-list?sort=${value}`}
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
