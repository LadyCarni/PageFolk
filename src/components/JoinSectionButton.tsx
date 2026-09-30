'use client'

import { Button } from '@chakra-ui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLock } from '@fortawesome/free-solid-svg-icons'

export function JoinSectionButton({ action }: { action: () => Promise<void> }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm('This thread may contain spoilers. Join?')) {
          e.preventDefault()
        }
      }}
    >
      <Button
        type="submit"
        size="sm"
        bg="brand.700"
        color="white"
        _hover={{ bg: 'brand.900' }}
        leftIcon={<FontAwesomeIcon icon={faLock} />}
      >
        Join Thread
      </Button>
    </form>
  )
}
