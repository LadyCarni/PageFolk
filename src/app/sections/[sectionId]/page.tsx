import { notFound, redirect } from 'next/navigation'
import { requireUser } from '@/lib/session'
import { listBooks } from '@/lib/books'
import { getSectionBookId } from '@/lib/sections'
import { threadHref } from '@/lib/threads'

// Old thread links keep working: they now open the thread inside the three-pane view.
export default async function SectionRedirect({ params }: { params: { sectionId: string } }) {
  await requireUser()
  const bookId = await getSectionBookId(params.sectionId)
  if (!bookId) notFound()
  const [current] = await listBooks('current')
  redirect(threadHref(bookId, current?.id ?? null, params.sectionId))
}
