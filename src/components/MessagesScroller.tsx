'use client'

import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { Box } from '@chakra-ui/react'

// Scrolls to the newest note when it mounts and whenever `scrollKey` changes. The key is the
// thread id plus its top-level note count, so a reply to an older note does not jump the pane.
export function MessagesScroller({ scrollKey, children }: { scrollKey: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (el) el.scrollTop = el.scrollHeight
  }, [scrollKey])

  return (
    <Box ref={ref} flex="1" minH={0} overflowY="auto" px={{ base: 4, md: 8 }} py={6}>
      {children}
    </Box>
  )
}
