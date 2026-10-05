import { notFound, redirect } from 'next/navigation'
import { requireUser } from '@/lib/session'
import { listBooks } from '@/lib/books'
import { canViewBook } from '@/lib/book-access'
import { getSectionBook } from '@/lib/sections'
import { threadHref } from '@/lib/threads'

// Old thread links keep working: they now open the thread inside the three-pane view.
export default async function SectionRedirect({ params }: { params: { sectionId: string } }) {
  const user = await requireUser()
  const section = await getSectionBook(params.sectionId)
  if (!section || !canViewBook(section.status, user.isAdmin)) notFound()
  const [current] = await listBooks('current')
  redirect(threadHref(section.bookId, current?.id ?? null, params.sectionId))
}
