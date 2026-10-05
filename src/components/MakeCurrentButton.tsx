'use client'

import { Button } from '@chakra-ui/react'
import { makeCurrentPrompt } from '@/lib/admin-view'

// Asks first when another book is current, because the swap changes This month for every member.
export function MakeCurrentButton({
  title,
  currentTitle,
  action,
}: {
  title: string
  currentTitle: string | null
  action: () => Promise<void>
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (currentTitle && !confirm(makeCurrentPrompt(title, currentTitle))) {
          e.preventDefault()
        }
      }}
    >
      <Button type="submit" size="sm" variant="goldOutline">
        Make current
      </Button>
    </form>
  )
}
