'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/session'
import { reportingValidation, type FormResult } from '@/lib/errors'
import { approveRequest, declineRequest, createAdminItem, setItemStatus, updateItem, addAdminReply } from '@/lib/roadmap'

const STATUSES = ['planned', 'in_progress', 'not_planned'] as const

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? '')
}

function revalidateRoadmap(pendingChanged = false) {
  revalidatePath('/whats-new')
  revalidatePath('/admin/feature-requests')
  if (pendingChanged) revalidatePath('/', 'layout')
}

export async function replyToItemAction(itemId: string, formData: FormData): Promise<void> {
  const admin = await requireAdmin()
  await addAdminReply(itemId, admin.id, text(formData, 'body'))
  revalidateRoadmap()
}

export async function approveRequestAction(itemId: string, formData: FormData): Promise<FormResult> {
  const admin = await requireAdmin()
  return reportingValidation(async () => {
    await approveRequest(itemId, admin.id, text(formData, 'title'), text(formData, 'description'))
    revalidateRoadmap(true)
  })
}

export async function declineRequestAction(itemId: string, formData: FormData): Promise<FormResult> {
  const admin = await requireAdmin()
  return reportingValidation(async () => {
    await declineRequest(itemId, admin.id, text(formData, 'note'))
    revalidateRoadmap(true)
  })
}

export async function createRoadmapItemAction(formData: FormData): Promise<FormResult> {
  const admin = await requireAdmin()
  return reportingValidation(async () => {
    await createAdminItem(admin.id, text(formData, 'title'), text(formData, 'description'))
    revalidateRoadmap()
  })
}

export async function setItemStatusAction(itemId: string, status: string): Promise<void> {
  const admin = await requireAdmin()
  if (!(STATUSES as readonly string[]).includes(status)) throw new Error('Invalid status')
  await setItemStatus(itemId, admin.id, status as (typeof STATUSES)[number])
  revalidateRoadmap()
}

export async function updateItemAction(itemId: string, formData: FormData): Promise<FormResult> {
  await requireAdmin()
  return reportingValidation(async () => {
    await updateItem(itemId, text(formData, 'title'), text(formData, 'description'))
    revalidateRoadmap()
  })
}
