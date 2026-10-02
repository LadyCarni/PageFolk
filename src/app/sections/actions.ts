'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/session'
import { setProgress } from '@/lib/progress'
import { createPost, deletePost } from '@/lib/posts'

function revalidateBookViews() {
  revalidatePath('/')
  revalidatePath('/shelf')
  revalidatePath('/shelf/[bookId]', 'page')
}

export async function setProgressAction(bookId: string, chaptersFinished: number): Promise<number> {
  const user = await requireUser()
  const saved = await setProgress(user.id, bookId, chaptersFinished)
  revalidateBookViews()
  return saved
}

export async function createPostAction(sectionId: string, formData: FormData) {
  const user = await requireUser()
  const body = String(formData.get('body') ?? '')
  const parentPostId = formData.get('parentPostId')
  await createPost(sectionId, user.id, body, parentPostId ? String(parentPostId) : undefined)
  revalidateBookViews()
}

export async function deletePostAction(sectionId: string, postId: string) {
  const user = await requireUser()
  await deletePost(postId, user.id)
  revalidateBookViews()
}
