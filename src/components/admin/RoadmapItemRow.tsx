'use client'

import { useState, useTransition } from 'react'
import { Box, Flex, Input, Select, Text, Textarea } from '@chakra-ui/react'
import { AdminForm, AdminFormActions } from '@/components/AdminForm'
import { FIELD_PROPS, SELECT_PROPS } from '@/components/adminStyles'
import { setItemStatusAction, updateItemAction } from '@/app/admin/feature-requests/actions'
import { FEATURE_DESCRIPTION_MAX, FEATURE_TITLE_MAX } from '@/lib/limits'

export function RoadmapItemRow({
  id,
  number,
  title,
  description,
  status,
  votes,
}: {
  id: string
  number: number | null
  title: string
  description: string
  status: 'planned' | 'in_progress'
  votes: number
}) {
  const [pending, startTransition] = useTransition()
  const [problem, setProblem] = useState<string | null>(null)

  function changeStatus(next: string) {
    setProblem(null)
    startTransition(async () => {
      try {
        await setItemStatusAction(id, next)
      } catch {
        setProblem('Could not change the status. Refresh and try again.')
      }
    })
  }

  return (
    <Box as="li" py={4} borderBottomWidth="1px" borderColor="divider">
      <Flex align="center" gap={3} wrap="wrap" mb={2}>
        <Text fontWeight={600} color="antiqueGold">
          #{number}
        </Text>
        <Text fontSize="sm" color="mist">
          {votes} {votes === 1 ? 'vote' : 'votes'}
        </Text>
        <Select
          // The server value wins after a refresh, so remount when it changes.
          key={status}
          aria-label={`Status of #${number}`}
          defaultValue={status}
          onChange={(e) => changeStatus(e.target.value)}
          isDisabled={pending}
          w="auto"
          size="sm"
          ml="auto"
          {...SELECT_PROPS}
        >
          <option value="planned">Planned</option>
          <option value="in_progress">In progress</option>
          <option value="not_planned">Not planned</option>
        </Select>
      </Flex>
      {problem && (
        <Text role="alert" fontSize="sm" color="danger" mb={2}>
          {problem}
        </Text>
      )}
      <AdminForm
        action={(formData) => updateItemAction(id, formData)}
        rule={{ kind: 'feature' }}
        mode="edit"
        submitLabel="Save"
        submitVariant="solid"
        showSaved
        layout="custom"
      >
        <Input name="title" defaultValue={title} aria-label="Title" maxLength={FEATURE_TITLE_MAX} mb={2} {...FIELD_PROPS} />
        <Textarea
          name="description"
          defaultValue={description}
          aria-label="Description"
          maxLength={FEATURE_DESCRIPTION_MAX}
          rows={2}
          mb={3}
          {...FIELD_PROPS}
        />
        <AdminFormActions />
      </AdminForm>
    </Box>
  )
}
