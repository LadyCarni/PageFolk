import { auth } from '@/auth'
import { getBookCover } from '@/lib/covers'

export async function GET(request: Request, { params }: { params: { bookId: string } }) {
  const session = await auth()
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const cover = await getBookCover(params.bookId)
  if (!cover) {
    return new Response('Not found', { status: 404 })
  }

  const etag = `"${cover.updatedAt.getTime()}"`
  const headers = {
    ETag: etag,
    'Cache-Control': 'private, max-age=0, must-revalidate',
    'X-Content-Type-Options': 'nosniff',
  }
  if (request.headers.get('if-none-match') === etag) {
    return new Response(null, { status: 304, headers })
  }

  return new Response(new Uint8Array(cover.data), {
    headers: { ...headers, 'Content-Type': cover.contentType },
  })
}
