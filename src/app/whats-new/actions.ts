'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/session'
import { reportingValidation, type FormResult } from '@/lib/errors'
import { submitRequest, toggleVote } from '@/lib/roadmap'

export async function submitFeatureRequestAction(formData: FormData): Promise<FormResult> {
  const user = await requireUser()
  const title = String(formData.get('title') ?? '')
  const description = String(formData.get('description') ?? '')
  return reportingValidation(async () => {
    await submitRequest(user.id, title, description)
    revalidatePath('/whats-new')
    revalidatePath('/', 'layout')
  })
}

export async function toggleVoteAction(itemId: string): Promise<void> {
  const user = await requireUser()
  await toggleVote(itemId, user.id)
  revalidatePath('/whats-new')
}
