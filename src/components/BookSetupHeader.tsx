'use client'

import { useState } from 'react'
import { Box, Button, Flex, Heading, Input, Text } from '@chakra-ui/react'
import { AdminForm } from '@/components/AdminForm'
import { CompletionChips, type Completion } from '@/components/CompletionChips'
import { LABEL_PROPS } from '@/components/adminStyles'
import { updateTotalChaptersAction } from '@/app/admin/actions'

const SUBTITLE_PROPS = { fontFamily: 'heading', fontStyle: 'italic', fontSize: 'xl', color: 'mist' } as const

// Title, "Author, N chapters" (the count edits in place), and the completion chips.
export function BookSetupHeader({
  bookId,
  title,
  author,
  totalChapters,
  minTotal,
  completion,
}: {
  bookId: string
  title: string
  author: string
  totalChapters: number
  minTotal: number
  completion: Completion
}) {
  const [editingTotal, setEditingTotal] = useState(false)
  const close = () => setEditingTotal(false)

  return (
    <Flex justify="space-between" align="flex-end" gap={4} wrap="wrap">
      <Box minW={0}>
        <Text {...LABEL_PROPS} color="dustyRose">
          Book setup
        </Text>
        <Heading as="h1" size="2xl" mt={1}>
          {title}
        </Heading>
        {editingTotal ? (
          <Box mt={2}>
            <AdminForm
              action={updateTotalChaptersAction}
              rule={{ kind: 'total', minTotal }}
              mode="edit"
              submitLabel="Save"
              hiddenFields={{ bookId }}
              onSuccess={close}
              onCancel={close}
            >
              <Text {...SUBTITLE_PROPS}>{author},</Text>
              <Input
                name="totalChapters"
                type="number"
                min={1}
                defaultValue={totalChapters}
                aria-label="Total chapters"
                size="sm"
                w="90px"
                required
                autoFocus
              />
              <Text {...SUBTITLE_PROPS}>chapters</Text>
            </AdminForm>
          </Box>
        ) : (
          <Flex align="baseline" gap={3} mt={1} wrap="wrap">
            <Text {...SUBTITLE_PROPS}>
              {author}, {totalChapters} chapters
            </Text>
            <Button size="sm" variant="link" aria-label="Edit total chapters" onClick={() => setEditingTotal(true)}>
              Edit
            </Button>
          </Flex>
        )}
      </Box>
      <CompletionChips completion={completion} />
    </Flex>
  )
}
