'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { Box, Button, Flex, Input, Text, Textarea } from '@chakra-ui/react'
import { approveRequestAction, declineRequestAction } from '@/app/admin/feature-requests/actions'
import { FIELD_PROPS, LABEL_PROPS } from '@/components/adminStyles'
import { toFormState, type FormState } from '@/lib/form-state'
import type { FormResult } from '@/lib/errors'
import { FEATURE_DESCRIPTION_MAX, FEATURE_TITLE_MAX } from '@/lib/limits'

// Unlike AdminForm these are submittable untouched: approving as written is the common case,
// and a decline needs no note. The server check shows its message under the form.
function ReviewForm({
  action,
  label,
  variant,
  confirmMessage,
  children,
}: {
  action: (formData: FormData) => Promise<FormResult>
  label: string
  variant: 'solid' | 'dangerOutline'
  confirmMessage?: string
  children: React.ReactNode
}) {
  const [state, formAction] = useFormState(
    async (_previous: FormState, formData: FormData): Promise<FormState> => toFormState(await action(formData)),
    {}
  )
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (confirmMessage && !window.confirm(confirmMessage)) e.preventDefault()
      }}
    >
      {children}
      <Flex align="center" gap={3} mt={3}>
        <SubmitButton label={label} variant={variant} />
        {state.error && (
          <Text role="alert" fontSize="sm" color="danger">
            {state.error}
          </Text>
        )}
      </Flex>
    </form>
  )
}

function SubmitButton({ label, variant }: { label: string; variant: 'solid' | 'dangerOutline' }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="sm" variant={variant} borderRadius="full" px={5} isDisabled={pending}>
      {label}
    </Button>
  )
}

export function ApproveForm({ itemId, title, description }: { itemId: string; title: string; description: string }) {
  return (
    <ReviewForm action={(formData) => approveRequestAction(itemId, formData)} label="Approve" variant="solid">
      <Text {...LABEL_PROPS} color="dustyRose" mb={2}>
        Roadmap wording
      </Text>
      <Input
        name="title"
        defaultValue={title}
        aria-label="Title"
        maxLength={FEATURE_TITLE_MAX}
        mb={2}
        {...FIELD_PROPS}
      />
      <Textarea
        name="description"
        defaultValue={description}
        aria-label="Description"
        maxLength={FEATURE_DESCRIPTION_MAX}
        rows={3}
        {...FIELD_PROPS}
      />
    </ReviewForm>
  )
}

export function DeclineForm({ itemId }: { itemId: string }) {
  return (
    <ReviewForm action={(formData) => declineRequestAction(itemId, formData)} label="Decline"
      variant="dangerOutline"
      confirmMessage="Decline this request? The requester will see it as Not planned."
    >
      <Box>
        <Text {...LABEL_PROPS} color="dustyRose" mb={2}>
          Note to the requester (optional)
        </Text>
        <Textarea name="note" aria-label="Note" rows={2} {...FIELD_PROPS} />
      </Box>
    </ReviewForm>
  )
}
