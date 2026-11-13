'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin, requireUser } from '@/lib/session'
import { DuplicateBookError, ValidationError } from '@/lib/errors'
import { parseWholeNumber } from '@/lib/chapters'
import {
  chooseLongListBook,
  createSuggestion,
  deleteSuggestion,
  toggleLongListVote,
  updateSuggestion,
} from '@/lib/long-list'

export type SuggestionResult = { error?: string; href?: string | null; bookId?: string }

// Turns the user-fixable errors into a result the form can show. Everything else, including the
// Forbidden error for someone else's suggestion, still throws.
async function reporting(work: () => Promise<SuggestionResult | void>): Promise<SuggestionResult> {
  try {
    const result = await work()
    return result ?? {}
  } catch (error) {
    if (error instanceof DuplicateBookError) return { error: error.message, href: error.href }
    if (error instanceof ValidationError) return { error: error.message }
    throw error
  }
}

function revalidateLongList() {
  revalidatePath('/long-list')
  revalidatePath('/long-list/[bookId]', 'page')
}

function suggestionFields(formData: FormData) {
  return {
    title: String(formData.get('title') ?? ''),
    author: String(formData.get('author') ?? ''),
    genre: String(formData.get('genre') ?? ''),
    synopsis: String(formData.get('synopsis') ?? ''),
  }
}

export async function suggestBookAction(formData: FormData): Promise<SuggestionResult> {
  const user = await requireUser()
  const input = suggestionFields(formData)
  return reporting(async () => {
    const { id } = await createSuggestion(user.id, input)
    revalidateLongList()
    return { bookId: id }
  })
}

export async function editSuggestionAction(formData: FormData): Promise<SuggestionResult> {
  const user = await requireUser()
  const id = String(formData.get('id') ?? '')
  const input = suggestionFields(formData)
  return reporting(async () => {
    await updateSuggestion(id, { id: user.id, isAdmin: user.isAdmin }, input)
    revalidateLongList()
    return { bookId: id }
  })
}

export async function deleteSuggestionAction(id: string): Promise<SuggestionResult> {
  const user = await requireUser()
  return reporting(async () => {
    await deleteSuggestion(id, { id: user.id, isAdmin: user.isAdmin })
    revalidateLongList()
  })
}

export async function toggleLongListVoteAction(bookId: string): Promise<SuggestionResult> {
  const user = await requireUser()
  return reporting(async () => {
    await toggleLongListVote(bookId, user.id)
    revalidateLongList()
  })
}

export async function chooseLongListBookAction(formData: FormData): Promise<SuggestionResult> {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  const totalChapters = parseWholeNumber(formData.get('totalChapters'))
  let chosenId: string | null = null
  const result = await reporting(async () => {
    const { bookId } = await chooseLongListBook(id, totalChapters)
    chosenId = bookId
    revalidateLongList()
    revalidatePath('/admin')
    revalidatePath('/')
    revalidatePath('/shelf')
  })
  // Outside reporting: redirect() works by throwing, and must not be caught there.
  if (chosenId) redirect(`/admin?book=${chosenId}`)
  return result
}
