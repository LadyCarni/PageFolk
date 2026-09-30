'use client'

import { Button } from '@chakra-ui/react'

export function DeleteSectionButton({
  label,
  postCount,
  action,
}: {
  label: string
  postCount: number
  action: () => Promise<void>
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (
          postCount > 0 &&
          !confirm(
            `"${label}" has ${postCount} post${postCount === 1 ? '' : 's'}. Deleting it will permanently delete all conversation in it. Continue?`
          )
        ) {
          e.preventDefault()
        }
      }}
    >
      <Button type="submit" size="sm" variant="link" color="red.600">
        Delete
      </Button>
    </form>
  )
}
