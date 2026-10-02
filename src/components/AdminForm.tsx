'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { Button, HStack, Text } from '@chakra-ui/react'
import { validateFormValues, type FormRule } from '@/lib/chapters'
import type { FormResult } from '@/app/admin/actions'

type SubmitVariant = 'link' | 'solid' | 'goldOutline'
type FormState = FormResult & { saved?: boolean }

function SubmitButton({
  label,
  icon,
  disabled,
  variant,
  width,
}: {
  label: string
  icon?: ReactNode
  disabled: boolean
  variant: SubmitVariant
  width?: string
}) {
  const { pending } = useFormStatus()
  if (variant === 'link') {
    return (
      <Button type="submit" size="sm" variant="link" flexShrink={0} isDisabled={disabled || pending}>
        {label}
      </Button>
    )
  }
  return (
    <Button
      type="submit"
      variant={variant}
      leftIcon={icon ? <>{icon}</> : undefined}
      borderRadius="full"
      px={6}
      w={width}
      flexShrink={0}
      isDisabled={disabled || pending}
    >
      {label}
    </Button>
  )
}

const ActionsContext = createContext<ReactNode>(null)

// Puts the form's Save / Cancel / Saved controls at this spot inside a layout="custom" form.
export function AdminFormActions() {
  return <>{useContext(ActionsContext)}</>
}

// An admin form that checks its own values as you type, using the same rules as the server.
// Save is disabled until something has changed and the values are valid; edit forms show
// Cancel beside it once a field differs from its saved value (always, when onCancel is given).
// The server check stays as a backstop and its message shows under the form if it ever rejects.
// layout="row" lays the fields and controls out in one row; layout="custom" leaves the layout to
// the children, which place <AdminFormActions /> where the controls should go.
export function AdminForm({
  action,
  rule,
  mode,
  submitLabel,
  submitIcon,
  submitVariant = 'link',
  submitWidth,
  showSaved,
  hiddenFields,
  mt,
  layout = 'row',
  onSuccess,
  onCancel,
  children,
}: {
  action: (formData: FormData) => Promise<FormResult>
  rule: FormRule
  mode: 'edit' | 'create'
  submitLabel: string
  submitIcon?: ReactNode
  submitVariant?: SubmitVariant
  submitWidth?: string
  showSaved?: boolean
  hiddenFields?: Record<string, string>
  mt?: string | number
  layout?: 'row' | 'custom'
  onSuccess?: () => void
  onCancel?: () => void
  children: ReactNode
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [serverState, formAction] = useFormState(async (_previous: FormState, formData: FormData): Promise<FormState> => {
    const result = await action(formData)
    return result.error ? result : { saved: true }
  }, {})
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
  // After a successful save: clear a create form, and let the parent react (e.g. close an inline form).
  useEffect(() => {
    if (!serverState.saved) return
    if (mode === 'create') formRef.current?.reset()
    onSuccess?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverState])

  function cancel() {
    formRef.current?.reset()
    setEditedSinceSubmit(true)
    evaluate()
    onCancel?.()
  }

  const clientMessage = changed ? problem : null
  const message = clientMessage ?? (editedSinceSubmit ? null : serverState.error ?? null)
  const canSubmit = changed && problem === null

  const actions = (
    <HStack spacing={3} flexShrink={0}>
      <SubmitButton
        label={submitLabel}
        icon={submitIcon}
        disabled={!canSubmit}
        variant={submitVariant}
        width={submitWidth}
      />
      {(onCancel || (mode === 'edit' && changed)) && (
        <Button type="button" size="sm" variant="link" color="mist" flexShrink={0} onClick={cancel}>
          Cancel
        </Button>
      )}
      {showSaved && serverState.saved && !changed && (
        <Text role="status" fontSize="sm" color="mist">
          Saved
        </Text>
      )}
    </HStack>
  )

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
      {layout === 'custom' ? (
        <ActionsContext.Provider value={actions}>{children}</ActionsContext.Provider>
      ) : (
        <HStack mt={mt}>
          {children}
          {actions}
        </HStack>
      )}
      {message && (
        <Text role="alert" mt={1} fontSize="sm" color="danger">
          {message}
        </Text>
      )}
    </form>
  )
}
