'use client'

import { useState } from 'react'
import { Box, Button, HStack, Select, Text } from '@chakra-ui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLockOpen } from '@fortawesome/free-solid-svg-icons'
import { SELECT_PROPS } from '@/components/adminStyles'
import { quickUnlockOptions } from '@/lib/chapters'

// A shortcut under the progress card: jump the reader's place forward to a chapter, or to the end.
// It only moves forward, so threads already open stay open.
export function QuickUnlockCard({
  finished,
  totalChapters,
  chapterNames,
  pending,
  onUnlock,
}: {
  finished: number
  totalChapters: number
  chapterNames: Record<number, string>
  pending: boolean
  onUnlock: (chapter: number) => void
}) {
  const options = quickUnlockOptions(finished, totalChapters, chapterNames)
  const [picked, setPicked] = useState('')
  if (options.length === 0) return null

  // The picked chapter may fall behind the reader's place after a + press; fall back to the next one.
  const target = options.some((o) => String(o.chapter) === picked) ? picked : String(options[0].chapter)

  return (
    <Box bg="velvet" color="parchment" borderWidth="1px" borderColor="borderGold" borderRadius="xl" p={4}>
      <Text fontSize="xs" letterSpacing="0.14em" textTransform="uppercase" color="antiqueGold" textAlign="center">
        Quick unlock
      </Text>
      <Text fontSize="sm" color="mist" mt={2} textAlign="center">
        Already read ahead? Unlocking opens every thread up to that chapter, so it may reveal spoilers.
      </Text>
      <HStack mt={3} spacing={2}>
        <Select
          {...SELECT_PROPS}
          size="sm"
          aria-label="Unlock up to chapter"
          value={target}
          onChange={(e) => setPicked(e.target.value)}
          isDisabled={pending}
        >
          {options.map((o) => (
            <option key={o.chapter} value={o.chapter}>
              {o.label}
            </option>
          ))}
        </Select>
        <Button size="sm" variant="goldOutline" flexShrink={0} onClick={() => onUnlock(Number(target))} isDisabled={pending}>
          Unlock
        </Button>
      </HStack>
      <Button
        size="sm"
        variant="ghost"
        color="dustyRose"
        leftIcon={<FontAwesomeIcon icon={faLockOpen} />}
        _hover={{ bg: 'mulberry' }}
        w="full"
        mt={2}
        onClick={() => onUnlock(totalChapters)}
        isDisabled={pending}
      >
        Unlock all chapters
      </Button>
    </Box>
  )
}
