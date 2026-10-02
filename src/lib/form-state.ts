import type { FormResult } from '@/app/admin/actions'

export type FormState = FormResult & { saved?: boolean }

// What an AdminForm shows after its action returns. A server action that calls redirect()
// resolves to undefined on the client, so a missing result counts as a successful save.
export function toFormState(result: FormResult | undefined): FormState {
  return result?.error ? result : { saved: true }
}
