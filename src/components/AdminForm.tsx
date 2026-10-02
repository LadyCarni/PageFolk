'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { Button, HStack, Text } from '@chakra-ui/react'
import { validateFormValues, type FormRule } from '@/lib/chapters'
import type { FormResult } from '@/app/admin/actions'

function SubmitButton({
  label,
  disabled,
  solid,
  width,
}: {
  label: string
  disabled: boolean
  solid?: boolean
  width?: string
}) {
  const { pending } = useFormStatus()
  if (solid) {
    return (
      <Button
        type="submit"
        w={width}
        flexShrink={0}
        isDisabled={disabled || pending}
      >
        {label}
      </Button>
    )
  }
  return (
    <Button type="submit" size="sm" variant="link" flexShrink={0} isDisabled={disabled || pending}>
      {label}
    </Button>
  )
}

// An admin form that checks its own values as you type, using the same rules as the server.
// Save is disabled until something has changed and the values are valid; edit forms show
// Cancel beside it once a field differs from its saved value. The server check stays as a
// backstop and its message shows under the form if it ever rejects.
export function AdminForm({
  action,
  rule,
  mode,
  submitLabel,
  solid,
  submitWidth,
  hiddenFields,
  mt,
  children,
}: {
  action: (formData: FormData) => Promise<FormResult>
  rule: FormRule
  mode: 'edit' | 'create'
  submitLabel: string
  solid?: boolean
  submitWidth?: string
  hiddenFields?: Record<string, string>
  mt?: string | number
  children: ReactNode
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [serverState, formAction] = useFormState(
    async (_previous: FormResult, formData: FormData) => action(formData),
    {}
  )
  const [changed, setChanged] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [editedSinceSubmit, setEditedSinceSubmit] = useState(false)

  function evaluate() {
    const form = formRef.current
    if (!form) return
    const values: Record<string, string> = {}
    let differs = false
    for (const element of Array.from(form.elements)) {
      if (
        (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) &&
        element.name &&
        element.type !== 'hidden'
      ) {
        values[element.name] = element.value
        if (element.value !== element.defaultValue) differs = true
      }
    }
    setChanged(differs)
    setProblem(validateFormValues(rule, values))
  }

  // Re-check after every render so saved values arriving from the server settle the form.
  useEffect(evaluate)
  useEffect(() => setEditedSinceSubmit(false), [serverState])

  function cancel() {
    formRef.current?.reset()
    setEditedSinceSubmit(true)
    evaluate()
  }

  const clientMessage = changed ? problem : null
  const message = clientMessage ?? (editedSinceSubmit ? null : serverState.error ?? null)
  const canSubmit = changed && problem === null

  return (
    <form
      ref={formRef}
      action={formAction}
      onInput={() => {
        setEditedSinceSubmit(true)
        evaluate()
      }}
    >
      {Object.entries(hiddenFields ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <HStack mt={mt}>
        {children}
        <SubmitButton label={submitLabel} disabled={!canSubmit} solid={solid} width={submitWidth} />
        {mode === 'edit' && changed && (
          <Button type="button" size="sm" variant="link" color="mist" flexShrink={0} onClick={cancel}>
            Cancel
          </Button>
        )}
      </HStack>
      {message && (
        <Text role="alert" mt={1} fontSize="sm" color="danger">
          {message}
        </Text>
      )}
    </form>
  )
}
