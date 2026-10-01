'use client'

import { Button } from '@chakra-ui/react'

export function DeleteBookButton({
  title,
  sectionCount,
  postCount,
  action,
}: {
  title: string
  sectionCount: number
  postCount: number
  action: () => Promise<void>
}) {
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

  function confirmed() {
    if (sectionCount === 0) {
      return confirm(`Delete "${title}"?`)
    }
    const typed = prompt(
      `"${title}" has ${plural(sectionCount, 'section')} and ${plural(postCount, 'post')}. Deleting it will permanently delete the book, all of its sections, and all conversation in them.\n\nType the book's title to confirm:`
    )
    return typed !== null && typed.trim() === title.trim()
  }

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirmed()) {
          e.preventDefault()
        }
      }}
    >
      <Button type="submit" size="sm" variant="link" color="danger">
        Delete book
      </Button>
    </form>
  )
}
