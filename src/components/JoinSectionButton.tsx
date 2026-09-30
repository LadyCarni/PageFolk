'use client'

import { Button } from '@chakra-ui/react'

export function JoinSectionButton({
  label,
  action,
}: {
  label: string
  action: () => Promise<void>
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`This may contain spoilers past "${label}" — join?`)) {
          e.preventDefault()
        }
      }}
    >
      <Button type="submit" variant="link" color="brand.500">
        🔒 {label}
      </Button>
    </form>
  )
}
