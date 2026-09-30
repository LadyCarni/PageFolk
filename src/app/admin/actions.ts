'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/session'
import { createBook, addSection, setBookStatus, updateSectionLabel, deleteSection } from '@/lib/books'
import { addAllowedEmail, removeAllowedEmail } from '@/lib/allowlist'

export async function createBookAction(formData: FormData) {
  await requireAdmin()
  const title = String(formData.get('title') ?? '').trim()
  const author = String(formData.get('author') ?? '').trim()
  if (!title || !author) {
    throw new Error('Title and author are required')
  }
  const book = await createBook({ title, author })
  revalidatePath('/admin')
  return book
}

export async function addSectionAction(formData: FormData) {
  await requireAdmin()
  const bookId = String(formData.get('bookId') ?? '')
  const label = String(formData.get('label') ?? '').trim()
  const order = Number(formData.get('order') ?? 0)
  if (!bookId || !label) {
    throw new Error('bookId and label are required')
  }
  await addSection(bookId, label, order)
  revalidatePath('/admin')
}

export async function setBookStatusAction(bookId: string, status: 'current' | 'past') {
  await requireAdmin()
  await setBookStatus(bookId, status)
  revalidatePath('/admin')
  revalidatePath('/')
}

export async function updateSectionLabelAction(formData: FormData) {
  await requireAdmin()
  const sectionId = String(formData.get('sectionId') ?? '')
  const label = String(formData.get('label') ?? '').trim()
  if (!sectionId || !label) {
    throw new Error('sectionId and label are required')
  }
  await updateSectionLabel(sectionId, label)
  revalidatePath('/admin')
}

export async function deleteSectionAction(sectionId: string) {
  await requireAdmin()
  await deleteSection(sectionId)
  revalidatePath('/admin')
  revalidatePath('/')
}

export async function addAllowedEmailAction(formData: FormData) {
  await requireAdmin()
  const email = String(formData.get('email') ?? '').trim()
  if (!email) throw new Error('email is required')
  await addAllowedEmail(email)
  revalidatePath('/admin/allowed-emails')
}

export async function removeAllowedEmailAction(email: string) {
  await requireAdmin()
  await removeAllowedEmail(email)
  revalidatePath('/admin/allowed-emails')
}
