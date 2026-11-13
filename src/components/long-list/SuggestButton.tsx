'use client'

import { Button, useDisclosure } from '@chakra-ui/react'
import { SuggestionModal } from './SuggestionModal'

export function SuggestButton() {
  const { isOpen, onOpen, onClose } = useDisclosure()
  return (
    <>
      <Button onClick={onOpen}>Suggest a book</Button>
      <SuggestionModal isOpen={isOpen} onClose={onClose} />
    </>
  )
}
