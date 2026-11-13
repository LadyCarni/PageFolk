import NextLink from 'next/link'
import { notFound } from 'next/navigation'
import { Box, Flex, Link } from '@chakra-ui/react'
import { requireUser } from '@/lib/session'
import { getLongListEntry } from '@/lib/long-list'
import { SuggestButton } from '@/components/long-list/SuggestButton'
import { SuggestionActions } from '@/components/long-list/SuggestionActions'
import { LongListDetails } from '@/components/long-list/LongListDetails'

export default async function LongListBookPage({ params }: { params: { bookId: string } }) {
  const user = await requireUser()
  const book = await getLongListEntry(params.bookId, { id: user.id, isAdmin: user.isAdmin })
  if (!book) notFound()

  return (
    <Box as="main" p={{ base: 0, md: 4 }}>
      <Flex justify="space-between" align="center" gap={3} mx={6} mt={6}>
        <Link as={NextLink} href="/long-list" color="mist">
          ← The Long List
        </Link>
        <SuggestButton />
      </Flex>
      <LongListDetails
        book={book}
        viewerId={user.id}
        isAdmin={user.isAdmin}
        actions={<SuggestionActions book={book} viewerId={user.id} isAdmin={user.isAdmin} onPhonePage />}
      />
    </Box>
  )
}
