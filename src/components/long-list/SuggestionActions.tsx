'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Box,
  Button,
  Flex,
  Text,
  useDisclosure,
} from '@chakra-ui/react'
import { deleteSuggestionAction } from '@/app/long-list/actions'
import type { LongListEntry } from '@/lib/long-list-view'
import { ChooseBookModal } from './ChooseBookModal'
import { SuggestionModal } from './SuggestionModal'

export function SuggestionActions({
  book,
  viewerId,
  isAdmin,
  onPhonePage,
}: {
  book: LongListEntry
  viewerId: string
  isAdmin: boolean
  onPhonePage: boolean
}) {
  const router = useRouter()
  const edit = useDisclosure()
  const remove = useDisclosure()
  const choose = useDisclosure()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  if (!book.canEdit && !isAdmin) return null

  const isOwner = book.suggestedBy.id === viewerId

  function onDelete() {
    setError(null)
    startTransition(async () => {
      try {
        const result = await deleteSuggestionAction(book.id)
        if (result.error) {
          setError(result.error)
          return
        }
        remove.onClose()
        if (onPhonePage) router.push('/long-list')
        else router.refresh()
      } catch {
        setError('Something went wrong. Try again.')
      }
    })
  }

  function closeDelete() {
    setError(null)
    remove.onClose()
  }

  return (
    <Box w="full">
      <Flex gap={3} wrap="wrap">
        <Button variant="goldOutline" onClick={edit.onOpen}>
          Edit
        </Button>
        <Button variant="dangerOutline" onClick={remove.onOpen}>
          {isOwner ? 'Delete my suggestion' : 'Delete'}
        </Button>
      </Flex>
      {isAdmin && (
        <Box mt={5} pt={4} borderTopWidth="1px" borderTopStyle="dashed" borderColor="borderMuted">
          <Text fontSize="xs" letterSpacing="0.14em" textTransform="uppercase" color="dustyRose" mb={3}>
            Admin
          </Text>
          <Button onClick={choose.onOpen}>Choose this book</Button>
        </Box>
      )}

      <SuggestionModal isOpen={edit.isOpen} onClose={edit.onClose} book={book} />
      <ChooseBookModal isOpen={choose.isOpen} onClose={choose.onClose} book={book} />
      <AlertDialog isOpen={remove.isOpen} leastDestructiveRef={cancelRef} onClose={closeDelete} isCentered>
        <AlertDialogOverlay>
          <AlertDialogContent bg="panel" borderWidth="1px" borderColor="border" mx={4}>
            <AlertDialogHeader color="parchment">{isOwner ? 'Delete my suggestion' : 'Delete'}</AlertDialogHeader>
            <AlertDialogBody>
              <Text>
                Remove <em>{book.title}</em> from The Long List? Its votes will be removed too.
              </Text>
              {error && (
                <Text color="danger" role="alert" fontSize="sm" mt={3}>
                  {error}
                </Text>
              )}
            </AlertDialogBody>
            <AlertDialogFooter gap={3}>
              <Button ref={cancelRef} variant="link" onClick={closeDelete} isDisabled={pending}>
                Cancel
              </Button>
              <Button variant="dangerOutline" onClick={onDelete} isLoading={pending}>
                {isOwner ? 'Delete my suggestion' : 'Delete'}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  )
}
