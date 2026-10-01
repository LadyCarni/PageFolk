'use client'

import type { ReactNode } from 'react'
import { useFormState } from 'react-dom'
import { Text } from '@chakra-ui/react'
import type { FormResult } from '@/app/admin/actions'

// A form whose server action returns { error } for input the admin can fix, so a
// rejected change shows a message under the form instead of a runtime-error overlay.
export function AdminForm({
  action,
  children,
}: {
  action: (formData: FormData) => Promise<FormResult>
  children: ReactNode
}) {
  const [state, formAction] = useFormState(
    async (_previous: FormResult, formData: FormData) => action(formData),
    {}
  )

  return (
    <form action={formAction}>
      {children}
      {state.error && (
        <Text role="alert" mt={1} fontSize="sm" color="red.600">
          {state.error}
        </Text>
      )}
    </form>
  )
}
