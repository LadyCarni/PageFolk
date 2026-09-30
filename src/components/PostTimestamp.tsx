'use client'

import { Text } from '@chakra-ui/react'

// Formatted in the viewer's locale/timezone, which the server can't know,
// so the server-rendered text may legitimately differ on hydration.
export function PostTimestamp({ createdAt }: { createdAt: Date }) {
  return (
    <Text fontSize="sm" color="brand.300" suppressHydrationWarning>
      {new Date(createdAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })}
    </Text>
  )
}
