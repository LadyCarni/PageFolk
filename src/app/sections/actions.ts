'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/session'
import { joinSection } from '@/lib/sections'

export async function joinSectionAction(sectionId: string) {
  const user = await requireUser()
  await joinSection(user.id, sectionId)
  revalidatePath('/')
  revalidatePath(`/sections/${sectionId}`)
}
