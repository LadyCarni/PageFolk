import NextLink from 'next/link'
import { notFound } from 'next/navigation'
import { Box, Link } from '@chakra-ui/react'
import { requireUser } from '@/lib/session'
import { getLongListEntry } from '@/lib/long-list'
import { LongListDetails } from '@/components/long-list/LongListDetails'

export default async function LongListBookPage({ params }: { params: { bookId: string } }) {
  const user = await requireUser()
  const book = await getLongListEntry(params.bookId, { id: user.id, isAdmin: user.isAdmin })
  if (!book) notFound()

  return (
    <Box as="main" p={{ base: 0, md: 4 }}>
      <Link as={NextLink} href="/long-list" display="inline-block" mx={{ base: 6, md: 6 }} mt={6} color="mist">
        ← The Long List
      </Link>
      <LongListDetails book={book} viewerId={user.id} isAdmin={user.isAdmin} />
    </Box>
  )
}
