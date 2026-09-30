'use client'

import { useRef } from 'react'
import { Button, HStack, Textarea } from '@chakra-ui/react'

export function PostForm({
  action,
  parentPostId,
  placeholder = 'Share your thoughts…',
}: {
  action: (formData: FormData) => Promise<void>
  parentPostId?: string
  placeholder?: string
}) {
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await action(formData)
        formRef.current?.reset()
      }}
    >
      {parentPostId && <input type="hidden" name="parentPostId" value={parentPostId} />}
      <HStack align="start">
        <Textarea name="body" placeholder={placeholder} required />
        <Button type="submit" bg="brand.700" color="white" _hover={{ bg: 'brand.900' }}>
          Post
        </Button>
      </HStack>
    </form>
  )
}
