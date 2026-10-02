'use client'

import { useLayoutEffect, useRef, useState, useTransition, type FormEvent, type KeyboardEvent } from 'react'
import {
  Box,
  Button,
  HStack,
  IconButton,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Text,
  Textarea,
  useDisclosure,
  VStack,
} from '@chakra-ui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRight, faCommentDots } from '@fortawesome/free-solid-svg-icons'
import { appendStarter, computeTextareaHeight } from '@/lib/composer'

const MAX_LINES = 6

// The note box. The text area grows with what you type, up to six lines, then scrolls. Starters
// and the send button are bottom-aligned so they stay put as it grows. Enter inserts a newline;
// Ctrl/Cmd+Enter or the send button posts. Whitespace-only notes cannot be sent.
export function NoteComposer({
  action,
  parentPostId,
  placeholder,
  variant,
  starters,
  onSent,
}: {
  action: (formData: FormData) => Promise<void>
  parentPostId?: string
  placeholder: string
  variant: 'bar' | 'inline'
  starters?: string[]
  onSent?: () => void
}) {
  const textRef = useRef<HTMLTextAreaElement>(null)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const starterMenu = useDisclosure()

  useLayoutEffect(() => {
    const el = textRef.current
    if (!el) return
    el.style.height = 'auto'
    const style = window.getComputedStyle(el)
    const fontSize = parseFloat(style.fontSize) || 16
    const { height, scroll } = computeTextareaHeight({
      scrollHeight: el.scrollHeight,
      lineHeight: parseFloat(style.lineHeight) || fontSize * 1.5,
      paddingSpace: parseFloat(style.paddingTop) + parseFloat(style.paddingBottom),
      borderSpace: parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth),
      maxLines: MAX_LINES,
    })
    el.style.height = `${height}px`
    el.style.overflowY = scroll ? 'auto' : 'hidden'
  }, [text])

  const canSend = text.trim() !== '' && !pending

  function send() {
    const body = text.trim()
    if (!body || pending) return
    const formData = new FormData()
    formData.set('body', body)
    if (parentPostId) formData.set('parentPostId', parentPostId)
    startTransition(async () => {
      try {
        await action(formData)
        setText('')
        setError(null)
        onSent?.()
      } catch {
        setError('Could not post your note. Try again.')
      }
    })
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      send()
    }
  }

  return (
    <Box
      as="form"
      w="100%"
      onSubmit={(event: FormEvent) => {
        event.preventDefault()
        send()
      }}
    >
      <HStack align="flex-end" spacing={3}>
        {variant === 'bar' && starters && (
          <Popover
            isOpen={starterMenu.isOpen}
            onOpen={starterMenu.onOpen}
            onClose={starterMenu.onClose}
            placement="top-start"
            isLazy
          >
            <PopoverTrigger>
              <Button
                type="button"
                variant="outline"
                flexShrink={0}
                borderRadius="full"
                borderColor="antiqueGold"
                color="antiqueGold"
                _hover={{ bg: 'mulberry' }}
                _active={{ bg: 'mulberry' }}
                leftIcon={<FontAwesomeIcon icon={faCommentDots} />}
              >
                Starters
              </Button>
            </PopoverTrigger>
            <PopoverContent bg="velvet" borderColor="border" w="min(28rem, 90vw)">
              <PopoverBody p={2}>
                <VStack align="stretch" spacing={1}>
                  {starters.map((prompt) => (
                    <Button
                      key={prompt}
                      type="button"
                      variant="ghost"
                      h="auto"
                      py={2}
                      px={3}
                      justifyContent="flex-start"
                      textAlign="left"
                      whiteSpace="normal"
                      fontWeight="normal"
                      color="body"
                      onClick={() => {
                        setText((current) => appendStarter(current, prompt))
                        starterMenu.onClose()
                        textRef.current?.focus()
                      }}
                    >
                      {prompt}
                    </Button>
                  ))}
                </VStack>
              </PopoverBody>
            </PopoverContent>
          </Popover>
        )}
        <Textarea
          ref={textRef}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label={placeholder}
          rows={1}
          resize="none"
          minH={0}
          lineHeight="1.5"
          py={2}
          px={4}
          flex="1"
          borderRadius={variant === 'bar' ? '2xl' : 'xl'}
        />
        <IconButton
          type="submit"
          aria-label="Send note"
          icon={<FontAwesomeIcon icon={faArrowRight} />}
          isRound
          flexShrink={0}
          isDisabled={!canSend}
        />
      </HStack>
      {error && (
        <Text role="alert" mt={1} fontSize="sm" color="danger">
          {error}
        </Text>
      )}
    </Box>
  )
}
