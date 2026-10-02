'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/session'
import { createBook, addSection, setBookStatus, updateSection, updateTotalChapters, deleteSection, deleteBook, setBlurb } from '@/lib/books'
import { setClubName } from '@/lib/club'
import { setBookCover, removeBookCover } from '@/lib/covers'
import { MAX_COVER_BYTES } from '@/lib/cover-limits'
import { addAllowedEmail, removeAllowedEmail } from '@/lib/allowlist'
import { ValidationError } from '@/lib/errors'
import { parseWholeNumber } from '@/lib/chapters'

export type FormResult = { error?: string }

// Turns the user-fixable ValidationError into a message the form can show.
// Everything else (e.g. "Forbidden: admin only") still throws.
async function reportingValidation(work: () => Promise<void>): Promise<FormResult> {
  try {
    await work()
    return {}
  } catch (error) {
    if (error instanceof ValidationError) return { error: error.message }
    throw error
  }
}

function revalidateBookPages() {
  revalidatePath('/admin')
  revalidatePath('/')
  revalidatePath('/shelf')
  revalidatePath('/shelf/[bookId]', 'page')
}

export async function createBookAction(formData: FormData): Promise<FormResult> {
  await requireAdmin()
  const title = String(formData.get('title') ?? '').trim()
  const author = String(formData.get('author') ?? '').trim()
  return reportingValidation(async () => {
    if (!title || !author) {
      throw new ValidationError('Title and author are required')
    }
    await createBook({ title, author, totalChapters: parseWholeNumber(formData.get('totalChapters')) })
    revalidatePath('/admin')
  })
}

export async function addSectionAction(formData: FormData): Promise<FormResult> {
  await requireAdmin()
  const bookId = String(formData.get('bookId') ?? '')
  if (!bookId) {
    throw new Error('bookId is required')
  }
  return reportingValidation(async () => {
    await addSection(bookId, {
      startChapter: parseWholeNumber(formData.get('startChapter')),
      endChapter: parseWholeNumber(formData.get('endChapter')),
      title: String(formData.get('title') ?? ''),
    })
    revalidateBookPages()
  })
}

export async function setBookStatusAction(bookId: string, status: 'current' | 'past') {
  await requireAdmin()
  await setBookStatus(bookId, status)
  revalidatePath('/admin')
  revalidatePath('/')
}

export async function updateSectionAction(formData: FormData): Promise<FormResult> {
  await requireAdmin()
  const sectionId = String(formData.get('sectionId') ?? '')
  if (!sectionId) {
    throw new Error('sectionId is required')
  }
  return reportingValidation(async () => {
    await updateSection(sectionId, {
      startChapter: parseWholeNumber(formData.get('startChapter')),
      endChapter: parseWholeNumber(formData.get('endChapter')),
      title: String(formData.get('title') ?? ''),
    })
    revalidateBookPages()
  })
}

export async function updateTotalChaptersAction(formData: FormData): Promise<FormResult> {
  await requireAdmin()
  const bookId = String(formData.get('bookId') ?? '')
  if (!bookId) {
    throw new Error('bookId is required')
  }
  return reportingValidation(async () => {
    await updateTotalChapters(bookId, parseWholeNumber(formData.get('totalChapters')))
    revalidateBookPages()
  })
}

export async function updateClubNameAction(formData: FormData): Promise<FormResult> {
  await requireAdmin()
  return reportingValidation(async () => {
    await setClubName(String(formData.get('clubName') ?? ''))
    // The name shows in the header of every page.
    revalidatePath('/', 'layout')
  })
}

export async function updateBlurbAction(formData: FormData): Promise<FormResult> {
  await requireAdmin()
  const bookId = String(formData.get('bookId') ?? '')
  if (!bookId) {
    throw new Error('bookId is required')
  }
  return reportingValidation(async () => {
    await setBlurb(bookId, String(formData.get('blurb') ?? ''))
    revalidateBookPages()
  })
}

export async function deleteSectionAction(sectionId: string) {
  await requireAdmin()
  await deleteSection(sectionId)
  revalidatePath('/admin')
  revalidatePath('/')
}

export async function deleteBookAction(bookId: string) {
  await requireAdmin()
  await deleteBook(bookId)
  revalidatePath('/admin')
  revalidatePath('/')
  revalidatePath('/shelf')
  revalidatePath('/shelf/[bookId]', 'page')
}

export async function uploadCoverAction(formData: FormData) {
  await requireAdmin()
  const bookId = String(formData.get('bookId') ?? '')
  const file = formData.get('cover')
  if (!bookId) throw new Error('bookId is required')
  if (!(file instanceof File) || file.size === 0) throw new Error('Choose an image file to upload')
  if (file.size > MAX_COVER_BYTES) {
    throw new Error(`Cover image must be ${MAX_COVER_BYTES / 1024} KB or smaller`)
  }
  await setBookCover(bookId, new Uint8Array(await file.arrayBuffer()))
  revalidatePath('/admin')
  revalidatePath('/')
  revalidatePath('/shelf')
  revalidatePath('/shelf/[bookId]', 'page')
}

export async function removeCoverAction(bookId: string) {
  await requireAdmin()
  await removeBookCover(bookId)
  revalidatePath('/admin')
  revalidatePath('/')
  revalidatePath('/shelf')
  revalidatePath('/shelf/[bookId]', 'page')
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
