'use client'

import { useRouter } from 'next/navigation'
import { Select } from '@chakra-ui/react'
import { longListPath, type LongListSort } from '@/lib/long-list-view'

// Filters the list to one of the genres its books have. Changing it keeps the sort and drops
// ?book=, so the panel shows the first matching book.
export function GenreSelect({ genres, genre, sort }: { genres: string[]; genre: string | null; sort: LongListSort }) {
  const router = useRouter()
  return (
    <Select
      aria-label="Filter by genre"
      value={genre ?? ''}
      onChange={(event) => router.push(longListPath({ sort, genre: event.target.value || null }))}
      size="sm"
      w="auto"
      minW="11rem"
      borderRadius="full"
      borderColor={genre ? 'antiqueGold' : 'border'}
      color={genre ? 'antiqueGold' : 'mist'}
      bg="transparent"
      sx={{ option: { bg: 'velvet', color: 'parchment' } }}
    >
      <option value="">All genres</option>
      {genres.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </Select>
  )
}
