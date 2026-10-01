'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/session'
import { setProgress } from '@/lib/progress'
import { createPost, deletePost } from '@/lib/posts'

export async function setProgressAction(bookId: string, chaptersFinished: number): Promise<number> {
  const user = await requireUser()
  const saved = await setProgress(user.id, bookId, chaptersFinished)
  revalidatePath('/')
  revalidatePath('/past-books')
  return saved
}

export async function createPostAction(sectionId: string, formData: FormData) {
  const user = await requireUser()
  const body = String(formData.get('body') ?? '')
  const parentPostId = formData.get('parentPostId')
  await createPost(sectionId, user.id, body, parentPostId ? String(parentPostId) : undefined)
  revalidatePath(`/sections/${sectionId}`)
}

export async function deletePostAction(sectionId: string, postId: string) {
  const user = await requireUser()
  await deletePost(postId, user.id)
  revalidatePath(`/sections/${sectionId}`)
  revalidatePath('/')
}
