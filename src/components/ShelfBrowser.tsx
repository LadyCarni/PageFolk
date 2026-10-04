'use client'

import { useRef, useState, type MouseEvent, type ReactNode } from 'react'
import NextLink from 'next/link'
import { Box, Grid, Link, Text } from '@chakra-ui/react'
import { CoverImage } from '@/components/CoverImage'
import { ShelfPreview } from '@/components/ShelfPreview'
import { NAV_HEIGHT_PX } from '@/lib/layout'
import { formatReadMonth } from '@/lib/read-month'
import { pickShelfBook, type ShelfBook } from '@/lib/shelf-view'

// Chakra's lg breakpoint: the preview panel only exists at this width and up.
const WIDE_QUERY = '(min-width: 62em)'

// The shelf grid with a preview of the selected book. On wide screens a plain click on a cover
// previews it (a second click on the selected cover opens it); everywhere else covers are links.
export function ShelfBrowser({
  books,
  requestedId,
  children,
}: {
  books: ShelfBook[]
  requestedId: string | undefined
  children: ReactNode
}) {
  const [selectedId, setSelectedId] = useState(() => pickShelfBook(books, requestedId))
  const panelRef = useRef<HTMLDivElement>(null)
  const selected = books.find((book) => book.id === selectedId) ?? null
  const fullHeight = `calc(100dvh - ${NAV_HEIGHT_PX}px)`

  function onCoverClick(event: MouseEvent<HTMLAnchorElement>, id: string) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    if (!window.matchMedia(WIDE_QUERY).matches || id === selectedId) return
    event.preventDefault()
    setSelectedId(id)
    panelRef.current?.scrollTo({ top: 0 })
    // replaceState keeps the choice across a refresh without a history entry per click.
    window.history.replaceState(null, '', `/shelf?book=${encodeURIComponent(id)}`)
  }

  return (
    <Grid templateColumns={{ base: '1fr', lg: '3fr 2fr' }} h={{ lg: fullHeight }} minH={{ base: fullHeight }}>
      <Box as="main" overflowY={{ lg: 'auto' }} minH={0} p={{ base: 6, md: 10 }}>
        {children}
        <Grid
          as="ul"
          templateColumns="repeat(auto-fill, minmax(150px, 200px))"
          justifyContent="start"
          gap={8}
          mt={8}
          mb={0}
          mx={0}
          p={0}
          listStyleType="none"
        >
          {books.map((book) => {
            const month = book.readMonth ? formatReadMonth(book.readMonth) : null
            const isSelected = book.id === selectedId
            return (
              <li key={book.id}>
                <Link
                  as={NextLink}
                  href={`/shelf/${book.id}`}
                  onClick={(event: MouseEvent<HTMLAnchorElement>) => onCoverClick(event, book.id)}
                  aria-label={[`${book.title} by ${book.author}`, book.read && 'read', month].filter(Boolean).join(', ')}
                  aria-current={isSelected ? 'true' : undefined}
                  display="block"
                  _hover={{ textDecoration: 'none' }}
                >
                  <Box
                    position="relative"
                    borderRadius="md"
                    outline={isSelected ? { base: 'none', lg: '2px solid' } : 'none'}
                    outlineColor="antiqueGold"
                    outlineOffset="6px"
                    transition="transform 0.15s"
                    _hover={{ transform: 'translateY(-2px)' }}
                  >
                    <CoverImage book={book} coverVersion={book.coverVersion} width="100%" />
                    {book.read && (
                      <Box
                        aria-hidden
                        position="absolute"
                        top={0}
                        right="12%"
                        w="11%"
                        h="16%"
                        bg="antiqueGold"
                        clipPath="polygon(0 0, 100% 0, 100% 100%, 50% 75%, 0 100%)"
                      />
                    )}
                  </Box>
                  {month && (
                    <Text textAlign="center" color="mist" mt={3}>
                      {month}
                    </Text>
                  )}
                </Link>
              </li>
            )
          })}
        </Grid>
      </Box>
      <Box
        as="aside"
        aria-label="Book preview"
        ref={panelRef}
        display={{ base: 'none', lg: 'block' }}
        overflowY="auto"
        minH={0}
        bg="panel"
        borderLeftWidth="1px"
        borderColor="divider"
      >
        {selected && <ShelfPreview book={selected} />}
      </Box>
    </Grid>
  )
}
