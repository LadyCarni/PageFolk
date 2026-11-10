'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { latestVersion } from '@/lib/changelog'
import { markVersionSeen } from '@/lib/whats-new'
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

// Records the visit. The version they had seen before goes in a short-lived cookie so the New tags
// survive re-renders (opening a thread, voting) during the same visit.
export async function markWhatsNewSeenAction(): Promise<void> {
  const user = await requireUser()
  const prev = await markVersionSeen(user.id)
  if (prev !== latestVersion()) {
    cookies().set('whats_new_prev', prev ?? '', { httpOnly: true, sameSite: 'lax', path: '/whats-new', maxAge: 3600 })
  }
}
