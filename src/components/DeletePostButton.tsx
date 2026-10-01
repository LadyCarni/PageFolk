'use client'

import { Button } from '@chakra-ui/react'

export function DeletePostButton({
  replyCount,
  action,
}: {
  replyCount: number
  action: () => Promise<void>
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (
          replyCount > 0 &&
          !confirm(
            `This post has ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}. Deleting it will permanently delete the whole thread, including everyone's replies. Continue?`
          )
        ) {
          e.preventDefault()
        }
      }}
    >
      <Button type="submit" size="xs" variant="link" color="danger">
        Delete
      </Button>
    </form>
  )
}
