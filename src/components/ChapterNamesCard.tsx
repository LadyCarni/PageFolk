'use client'

import { useRef, useState, type ClipboardEvent } from 'react'
import { Box, Button, Flex, Heading, Input, SimpleGrid, Text } from '@chakra-ui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons'
import { AdminForm, AdminFormActions } from '@/components/AdminForm'
import { CARD_PROPS, FIELD_PROPS } from '@/components/adminStyles'
import { fillDown } from '@/lib/chapters'
import { CHAPTER_NAME_MAX } from '@/lib/limits'
import { updateChapterNamesAction } from '@/app/admin/actions'

// Optional names for books whose chapters have names instead of numbers. Collapsed until a book
// has some, so it stays out of the way for books that don't need it.
export function ChapterNamesCard({
  bookId,
  totalChapters,
  names,
}: {
  bookId: string
  totalChapters: number
  names: { number: number; name: string }[]
}) {
  const [open, setOpen] = useState(names.length > 0)
  const [dropped, setDropped] = useState(0)
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const saved = new Map(names.map((n) => [n.number, n.name]))

  // A multi-line paste fills this row and the rows below. Setting .value doesn't fire input,
  // so dispatch one to let AdminForm re-check and enable Save.
  function pasteDown(event: ClipboardEvent<HTMLInputElement>, index: number) {
    const text = event.clipboardData.getData('text')
    if (!/\r?\n/.test(text)) return
    event.preventDefault()
    const result = fillDown(
      inputs.current.map((input) => input?.value ?? ''),
      index,
      text
    )
    result.values.forEach((value, i) => {
      const input = inputs.current[i]
      if (input) input.value = value
    })
    setDropped(result.dropped)
    event.currentTarget.dispatchEvent(new Event('input', { bubbles: true }))
  }

  return (
    <Box as="section" id="chapter-names" aria-labelledby="chapter-names-heading" scrollMarginTop={6} {...CARD_PROPS}>
      <Flex justify="space-between" align="flex-start" gap={4} wrap="wrap">
        <Box maxW="lg">
          <Heading as="h2" id="chapter-names-heading" size="lg">
            Chapter names
          </Heading>
          <Text color="mist" mt={2}>
            Optional. For books whose chapters have names instead of numbers.
          </Text>
        </Box>
        <Button
          variant="link"
          rightIcon={<FontAwesomeIcon icon={open ? faChevronUp : faChevronDown} />}
          aria-expanded={open}
          aria-controls="chapter-names-rows"
          onClick={() => setOpen(!open)}
        >
          {open ? 'Hide' : 'Show'}
        </Button>
      </Flex>
      {open && (
        <Box id="chapter-names-rows" mt={6}>
          <Text fontSize="sm" color="mist" mb={4}>
            Fill in any you know and leave the rest blank. Paste a list into a row to fill it and the rows below.
          </Text>
          <AdminForm
            action={updateChapterNamesAction}
            rule={{ kind: 'chapterNames' }}
            mode="edit"
            layout="custom"
            submitLabel="Save names"
            submitVariant="solid"
            showSaved
            hiddenFields={{ bookId }}
          >
            <SimpleGrid columns={{ base: 1, md: 2 }} spacingX={6} spacingY={3}>
              {Array.from({ length: totalChapters }, (_, i) => i + 1).map((number) => (
                <Flex as="label" key={number} align="center" gap={3}>
                  <Text fontSize="sm" color="mist" w="2.5em" textAlign="right" flexShrink={0}>
                    {number}
                  </Text>
                  <Input
                    {...FIELD_PROPS}
                    ref={(element) => {
                      inputs.current[number - 1] = element
                    }}
                    name={`name-${number}`}
                    defaultValue={saved.get(number) ?? ''}
                    maxLength={CHAPTER_NAME_MAX}
                    aria-label={`Chapter ${number} name`}
                    onPaste={(event) => pasteDown(event, number - 1)}
                  />
                </Flex>
              ))}
            </SimpleGrid>
            {dropped > 0 && (
              <Text role="status" mt={3} fontSize="sm" color="mist">
                {dropped} line{dropped === 1 ? '' : 's'} didn&apos;t fit and {dropped === 1 ? 'was' : 'were'} left out.
              </Text>
            )}
            <Box mt={5}>
              <AdminFormActions />
            </Box>
          </AdminForm>
        </Box>
      )}
    </Box>
  )
}
