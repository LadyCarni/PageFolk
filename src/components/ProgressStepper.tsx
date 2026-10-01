'use client'

import { useState, useTransition } from 'react'
import { Box, Flex, HStack, IconButton, Text } from '@chakra-ui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMinus, faPlus } from '@fortawesome/free-solid-svg-icons'
import { clampProgress, segmentStates } from '@/lib/chapters'

const SEGMENT_COLORS = { done: 'antiqueGold', current: 'progressCurrent', todo: 'progressTodo' } as const

export function ProgressStepper({
  bookId,
  totalChapters,
  initialFinished,
  sections,
  saveProgress,
}: {
  bookId: string
  totalChapters: number
  initialFinished: number
  sections: { startChapter: number; endChapter: number }[]
  saveProgress: (bookId: string, chaptersFinished: number) => Promise<number>
}) {
  const [finished, setFinished] = useState(initialFinished)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function step(delta: number) {
    const next = clampProgress(finished + delta, totalChapters)
    if (next === finished) return
    const previous = finished
    setFinished(next)
    setError(null)
    startTransition(async () => {
      try {
        setFinished(await saveProgress(bookId, next))
      } catch {
        setFinished(previous)
        setError('Could not save your place. Try again.')
      }
    })
  }

  const buttonProps = {
    variant: 'outline',
    borderRadius: 'full',
    borderColor: 'antiqueGold',
    color: 'antiqueGold',
    bg: 'transparent',
    _hover: { bg: 'mulberry' },
  } as const

  return (
    <Box bg="velvet" color="parchment" borderWidth="1px" borderColor="border" borderRadius="xl" p={5}>
      <Text fontSize="xs" letterSpacing="0.14em" textTransform="uppercase" color="dustyRose" textAlign="center">
        Your place in the book
      </Text>
      <Flex align="center" justify="space-between" mt={4}>
        <IconButton
          aria-label="One chapter fewer"
          icon={<FontAwesomeIcon icon={faMinus} />}
          onClick={() => step(-1)}
          isDisabled={pending || finished <= 0}
          {...buttonProps}
        />
        <Box textAlign="center">
          <Text fontFamily="heading" fontWeight="bold" fontSize="4xl" lineHeight="1" color="antiqueGold" aria-live="polite">
            {finished}
          </Text>
          <Text fontSize="sm" color="mist">
            chapters finished, of {totalChapters}
          </Text>
        </Box>
        <IconButton
          aria-label="One chapter more"
          icon={<FontAwesomeIcon icon={faPlus} />}
          onClick={() => step(1)}
          isDisabled={pending || finished >= totalChapters}
          {...buttonProps}
        />
      </Flex>
      <HStack spacing={1} mt={4} aria-hidden>
        {segmentStates(sections, finished).map((state, index) => (
          <Box key={index} flex="1" h="6px" borderRadius="full" bg={SEGMENT_COLORS[state]} />
        ))}
      </HStack>
      {error && (
        <Text role="alert" mt={2} fontSize="sm" color="dustyRose">
          {error}
        </Text>
      )}
    </Box>
  )
}
