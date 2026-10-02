import { Box, Flex, Link, Text } from '@chakra-ui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck } from '@fortawesome/free-solid-svg-icons'

export type Completion = { description: boolean; cover: boolean; sections: boolean }

const CHIPS = [
  { key: 'description', label: 'Description', done: 'done', notDone: 'not set' },
  { key: 'cover', label: 'Cover', done: 'done', notDone: 'not set' },
  { key: 'sections', label: 'Sections', done: 'every chapter covered', notDone: 'not all chapters covered' },
] as const

// What's filled in for this book. Each chip jumps to the card that fills it in.
export function CompletionChips({ completion }: { completion: Completion }) {
  return (
    <Flex as="ul" listStyleType="none" gap={3} wrap="wrap" m={0} p={0} aria-label="Setup checklist">
      {CHIPS.map((chip) => {
        const done = completion[chip.key]
        return (
          <Box as="li" key={chip.key}>
            <Link
              href={`#${chip.key}`}
              aria-label={`${chip.label}: ${done ? chip.done : chip.notDone}`}
              display="flex"
              alignItems="center"
              gap={2}
              px={4}
              py={1.5}
              borderRadius="full"
              borderWidth="1px"
              borderColor={done ? 'antiqueGold' : 'borderMuted'}
              bg={done ? 'mulberry' : 'transparent'}
              color={done ? 'parchment' : 'mist'}
              _hover={{ bg: 'bubbleMine', textDecoration: 'none' }}
              _focusVisible={{ outline: '2px solid', outlineColor: 'antiqueGold', outlineOffset: '2px' }}
            >
              {done ? (
                <Box as="span" aria-hidden color="antiqueGold" fontSize="sm">
                  <FontAwesomeIcon icon={faCheck} />
                </Box>
              ) : (
                <Box as="span" aria-hidden boxSize="10px" borderRadius="full" borderWidth="1.5px" borderColor="mist" />
              )}
              <Text as="span" color="inherit">
                {chip.label}
              </Text>
            </Link>
          </Box>
        )
      })}
    </Flex>
  )
}
