'use client'

import { Text } from '@chakra-ui/react'

// Formatted in the viewer's locale/timezone, which the server can't know,
// so the server-rendered text may legitimately differ on hydration.
export function SuggestionDate({ createdAt }: { createdAt: Date }) {
  return (
    <Text as="span" suppressHydrationWarning>
      {new Date(createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
    </Text>
  )
}
