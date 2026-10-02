import { notFound, redirect } from 'next/navigation'
import { requireUser } from '@/lib/session'
import { listBooks } from '@/lib/books'
import { getBookView } from '@/lib/book-view'
import { bookPath } from '@/lib/threads'
import { BookView } from '@/components/BookView'

export default async function ShelfBookPage({
  params,
  searchParams,
}: {
  params: { bookId: string }
  searchParams: { thread?: string | string[] }
}) {
  const user = await requireUser()
  const [current] = await listBooks('current')
  const requested = typeof searchParams.thread === 'string' ? searchParams.thread : undefined

  // The current book lives at "/", so send anyone who lands here to the one canonical place.
  if (current && params.bookId === current.id) {
    redirect(requested ? `/?thread=${encodeURIComponent(requested)}` : '/')
  }

  const data = await getBookView(params.bookId, user.id, requested)
  if (!data) notFound()

  return (
    <BookView
      data={data}
      viewerId={user.id}
      basePath={bookPath(params.bookId, current?.id ?? null)}
      label="On our shelf"
    />
  )
}
