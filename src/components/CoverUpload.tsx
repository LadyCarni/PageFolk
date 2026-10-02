'use client'

import { useRef, useState } from 'react'
import { Box, Button, Text } from '@chakra-ui/react'
import { COVER_ACCEPT, MAX_COVER_BYTES } from '@/lib/cover-limits'

// Choosing a file uploads it straight away. The size check runs first, so an oversized image
// never leaves the browser.
export function CoverUpload({
  bookId,
  title,
  hasCover,
  uploadAction,
  removeAction,
}: {
  bookId: string
  title: string
  hasCover: boolean
  uploadAction: (formData: FormData) => Promise<void>
  removeAction: () => Promise<void>
}) {
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function upload(file: File) {
    const formData = new FormData()
    formData.set('bookId', bookId)
    formData.set('cover', file)
    setUploading(true)
    try {
      await uploadAction(formData)
      setError(null)
    } catch {
      setError('That image could not be uploaded. Try a JPG, PNG or WebP within the size limit.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <Box mt={4}>
      <input
        ref={inputRef}
        type="file"
        accept={COVER_ACCEPT}
        hidden
        aria-label={`Cover image for ${title}`}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (!file) return
          if (file.size > MAX_COVER_BYTES) {
            setError(`That image is ${Math.round(file.size / 1024)} KB. The limit is ${MAX_COVER_BYTES / 1024} KB.`)
            e.target.value = ''
            return
          }
          void upload(file)
        }}
      />
      <Button
        variant="goldOutline"
        px={6}
        onClick={() => inputRef.current?.click()}
        isLoading={uploading}
        loadingText="Uploading"
      >
        {hasCover ? 'Replace cover image' : 'Choose cover image'}
      </Button>
      <Text fontSize="sm" color="mist" mt={3}>
        JPG, PNG or WebP, up to {MAX_COVER_BYTES / 1024} KB.
      </Text>
      {error && (
        <Text role="alert" fontSize="sm" color="danger" mt={1}>
          {error}
        </Text>
      )}
      {hasCover && (
        <form action={removeAction}>
          <Button type="submit" size="sm" variant="link" color="danger" mt={2}>
            Remove cover
          </Button>
        </form>
      )}
    </Box>
  )
}
