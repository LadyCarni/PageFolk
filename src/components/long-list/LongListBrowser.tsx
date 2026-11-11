'use client'

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { Box, Grid } from '@chakra-ui/react'
import { NAV_HEIGHT_PX } from '@/lib/layout'
import type { LongListEntry, LongListSort } from '@/lib/long-list-view'
import { LongListDetails } from './LongListDetails'
import { LongListRow } from './LongListRow'
import { SuggestionActions } from './SuggestionActions'

// Chakra's lg breakpoint: the details panel only exists at this width and up.
const WIDE_QUERY = '(min-width: 62em)'

export function LongListBrowser({
  books,
  sort,
  viewerId,
  isAdmin,
  header,
}: {
  books: LongListEntry[]
  sort: LongListSort
  viewerId: string
  isAdmin: boolean
  header: ReactNode
}) {
  // Read ?book= from the live URL: after replaceState the cached server render has stale params.
  const searchParams = useSearchParams()
  const [selectedId, setSelectedId] = useState(searchParams.get('book'))
  // A new ?book= arriving through navigation (e.g. after suggesting) selects that book.
  const bookParam = searchParams.get('book')
  useEffect(() => {
    if (bookParam) setSelectedId(bookParam)
  }, [bookParam])
  const panelRef = useRef<HTMLDivElement>(null)
  const selected = books.find((book) => book.id === selectedId) ?? books[0] ?? null
  const fullHeight = `calc(100dvh - ${NAV_HEIGHT_PX}px)`

  function onSelect(event: MouseEvent<HTMLAnchorElement>, id: string) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    if (!window.matchMedia(WIDE_QUERY).matches) return
    event.preventDefault()
    setSelectedId(id)
    panelRef.current?.scrollTo({ top: 0 })
    window.history.replaceState(null, '', `/long-list?sort=${sort}&book=${encodeURIComponent(id)}`)
  }

  return (
    <Grid templateColumns={{ base: '1fr', lg: '3fr 2fr' }} h={{ lg: fullHeight }} minH={{ base: fullHeight }}>
      <Box as="main" overflowY={{ lg: 'auto' }} minH={0} p={{ base: 6, md: 10 }}>
        {header}
        <Box as="ul" mt={6} mx={-4} p={0} listStyleType="none">
          {books.map((book) => (
            <LongListRow
              key={book.id}
              book={book}
              selected={book.id === selected?.id}
              onSelect={onSelect}
            />
          ))}
        </Box>
      </Box>
      <Box
        as="aside"
        aria-label="Book details"
        ref={panelRef}
        display={{ base: 'none', lg: 'block' }}
        overflowY="auto"
        minH={0}
        bg="panel"
        borderLeftWidth="1px"
        borderColor="divider"
      >
        {selected && (
          <LongListDetails
            key={selected.id}
            book={selected}
            viewerId={viewerId}
            isAdmin={isAdmin}
            actions={
              <SuggestionActions book={selected} viewerId={viewerId} isAdmin={isAdmin} onPhonePage={false} />
            }
          />
        )}
      </Box>
    </Grid>
  )
}
