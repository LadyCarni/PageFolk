'use client'

import { useState, useTransition, type FormEvent } from 'react'
import NextLink from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Text,
  Textarea,
} from '@chakra-ui/react'
import { editSuggestionAction, suggestBookAction } from '@/app/long-list/actions'
import { GENRES } from '@/lib/genres'
import { LONG_LIST_AUTHOR_MAX, LONG_LIST_SYNOPSIS_MAX, LONG_LIST_TITLE_MAX } from '@/lib/limits'
import { longListTarget, parseSort, type LongListEntry } from '@/lib/long-list-view'

// Chakra's lg breakpoint: the details panel only exists at this width and up.
const WIDE_QUERY = '(min-width: 62em)'

export function SuggestionModal({
  isOpen,
  onClose,
  book,
}: {
  isOpen: boolean
  onClose: () => void
  book?: LongListEntry
}) {
  const router = useRouter()
  const sort = parseSort(useSearchParams().get('sort') ?? undefined)
  const [error, setError] = useState<{ message: string; href?: string | null } | null>(null)
  const [pending, startTransition] = useTransition()
  const editing = Boolean(book)

  function close() {
    setError(null)
    onClose()
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      try {
        const result = editing ? await editSuggestionAction(data) : await suggestBookAction(data)
        if (result.error) {
          setError({ message: result.error, href: result.href })
          return
        }
        onClose()
        if (editing) {
          router.refresh()
        } else if (result.bookId) {
          router.push(longListTarget(`/long-list?book=${result.bookId}`, window.matchMedia(WIDE_QUERY).matches, sort))
        }
      } catch {
        setError({ message: 'Something went wrong. Try again.' })
      }
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={close} isCentered size="lg" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent as="form" onSubmit={onSubmit} bg="panel" borderWidth="1px" borderColor="border" mx={4}>
        <ModalHeader color="parchment">{editing ? 'Edit suggestion' : 'Suggest a book'}</ModalHeader>
        <ModalCloseButton />
        <ModalBody display="flex" flexDirection="column" gap={4}>
          {book && <input type="hidden" name="id" value={book.id} />}
          <FormControl>
            <FormLabel>Title</FormLabel>
            <Input name="title" defaultValue={book?.title ?? ''} maxLength={LONG_LIST_TITLE_MAX} />
          </FormControl>
          <FormControl>
            <FormLabel>Author</FormLabel>
            <Input name="author" defaultValue={book?.author ?? ''} maxLength={LONG_LIST_AUTHOR_MAX} />
          </FormControl>
          <FormControl>
            <FormLabel>Genre</FormLabel>
            <Select name="genre" defaultValue={book?.genre ?? ''} bg="velvet" color="parchment" borderColor="borderMuted">
              <option value="">No genre</option>
              {GENRES.map((genre) => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </Select>
          </FormControl>
          <SynopsisField initial={book?.synopsis ?? ''} />
          {error && (
            <Box role="alert" fontSize="sm">
              <Text as="span" color="danger">
                {error.message}
              </Text>
              {error.href && (
                <>
                  {' '}
                  <Link
                    as={NextLink}
                    href={longListTarget(error.href, window.matchMedia(WIDE_QUERY).matches, sort)}
                    onClick={close}
                  >
                    See it
                  </Link>
                </>
              )}
            </Box>
          )}
        </ModalBody>
        <ModalFooter gap={3}>
          <Button type="button" variant="link" onClick={close} isDisabled={pending}>
            Cancel
          </Button>
          <Button type="submit" isLoading={pending}>
            {editing ? 'Save changes' : 'Add to the Long List'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

// Lives inside ModalBody so its counter remounts, and resets, together with the textarea.
function SynopsisField({ initial }: { initial: string }) {
  const [length, setLength] = useState(initial.length)
  return (
    <FormControl>
      <FormLabel>Synopsis</FormLabel>
      <Textarea
        name="synopsis"
        rows={4}
        defaultValue={initial}
        maxLength={LONG_LIST_SYNOPSIS_MAX}
        placeholder="A sentence or two about the book."
        onChange={(e) => setLength(e.target.value.length)}
      />
      <Text fontSize="sm" color="mist" mt={1} textAlign="right" aria-live="polite">
        {length} / {LONG_LIST_SYNOPSIS_MAX}
      </Text>
    </FormControl>
  )
}
