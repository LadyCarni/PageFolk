'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/session'
import { joinSection } from '@/lib/sections'
import { createPost } from '@/lib/posts'

export async function joinSectionAction(sectionId: string) {
  const user = await requireUser()
  await joinSection(user.id, sectionId)
  revalidatePath('/')
  revalidatePath(`/sections/${sectionId}`)
}

export async function createPostAction(sectionId: string, formData: FormData) {
  const user = await requireUser()
  const body = String(formData.get('body') ?? '')
  const parentPostId = formData.get('parentPostId')
  await createPost(sectionId, user.id, body, parentPostId ? String(parentPostId) : undefined)
  revalidatePath(`/sections/${sectionId}`)
}
