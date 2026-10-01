'use client'

import { useRef, useState } from 'react'
import { Box, Button, HStack, Image, Text } from '@chakra-ui/react'
import { COVER_ACCEPT, MAX_COVER_BYTES } from '@/lib/cover-limits'

export function CoverUpload({
  bookId,
  title,
  coverVersion,
  uploadAction,
  removeAction,
}: {
  bookId: string
  title: string
  coverVersion: number | null
  uploadAction: (formData: FormData) => Promise<void>
  removeAction: () => Promise<void>
}) {
  const [error, setError] = useState<string | null>(null)
  const [hasFile, setHasFile] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <HStack align="flex-start" spacing={4} mt="1em">
      {coverVersion !== null && (
        <Image
          src={`/books/${bookId}/cover?v=${coverVersion}`}
          alt={`Cover of ${title}`}
          w="60px"
          borderRadius="sm"
          flexShrink={0}
        />
      )}
      <Box>
        <form
          action={async (formData) => {
            await uploadAction(formData)
            if (inputRef.current) inputRef.current.value = ''
            setHasFile(false)
          }}
        >
          <input type="hidden" name="bookId" value={bookId} />
          <HStack>
            <input
              ref={inputRef}
              type="file"
              name="cover"
              accept={COVER_ACCEPT}
              aria-label={`Cover image for ${title}`}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file && file.size > MAX_COVER_BYTES) {
                  setError(`That image is ${Math.round(file.size / 1024)} KB. The limit is ${MAX_COVER_BYTES / 1024} KB.`)
                  e.target.value = ''
                  setHasFile(false)
                  return
                }
                setError(null)
                setHasFile(Boolean(file))
              }}
            />
            <Button type="submit" size="sm" isDisabled={!hasFile}>
              {coverVersion === null ? 'Upload cover' : 'Replace cover'}
            </Button>
          </HStack>
        </form>
        <Text fontSize="xs" color="mist" mt={1}>
          PNG, JPEG, or WebP, up to {MAX_COVER_BYTES / 1024} KB.
        </Text>
        {error && (
          <Text fontSize="sm" color="danger" mt={1} role="alert">
            {error}
          </Text>
        )}
        {coverVersion !== null && (
          <form action={removeAction}>
            <Button type="submit" size="xs" variant="link" color="danger" mt={1}>
              Remove cover
            </Button>
          </form>
        )}
      </Box>
    </HStack>
  )
}
