'use client'

import { useState, useTransition, type FormEvent } from 'react'
import {
  Button,
  FormControl,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  NumberInput,
  NumberInputField,
  Text,
} from '@chakra-ui/react'
import { chooseLongListBookAction } from '@/app/long-list/actions'
import type { LongListEntry } from '@/lib/long-list-view'

export function ChooseBookModal({
  isOpen,
  onClose,
  book,
}: {
  isOpen: boolean
  onClose: () => void
  book: LongListEntry
}) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

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
        // On success the action redirects, so a returned value is always an error.
        const result = await chooseLongListBookAction(data)
        if (result?.error) setError(result.error)
      } catch (err) {
        // redirect() surfaces as a thrown navigation signal in some Next versions; let it through.
        const digest = (err as { digest?: unknown } | null)?.digest
        if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) throw err
        setError('Something went wrong. Try again.')
      }
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={close} isCentered>
      <ModalOverlay />
      <ModalContent as="form" onSubmit={onSubmit} bg="panel" borderWidth="1px" borderColor="border" mx={4}>
        <ModalHeader color="parchment">Choose this book</ModalHeader>
        <ModalCloseButton />
        <ModalBody display="flex" flexDirection="column" gap={4}>
          <input type="hidden" name="id" value={book.id} />
          <Text>
            How many chapters does <em>{book.title}</em> have?
          </Text>
          <FormControl>
            <NumberInput min={1} clampValueOnBlur={false}>
              <NumberInputField name="totalChapters" aria-label="Number of chapters" />
            </NumberInput>
          </FormControl>
          {error && (
            <Text color="danger" role="alert" fontSize="sm">
              {error}
            </Text>
          )}
        </ModalBody>
        <ModalFooter gap={3}>
          <Button type="button" variant="link" onClick={close} isDisabled={pending}>
            Cancel
          </Button>
          <Button type="submit" isLoading={pending}>
            Choose this book
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
