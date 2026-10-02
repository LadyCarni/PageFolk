import { Box, Heading, Text, VStack } from '@chakra-ui/react'
import type { BookViewData } from '@/lib/book-view'
import { setProgressAction } from '@/app/sections/actions'
import { CoverImage } from '@/components/CoverImage'
import { ProgressStepper } from '@/components/ProgressStepper'

export function BookPanel({ data, label }: { data: BookViewData; label: string }) {
  const { book, finished, sections } = data

  return (
    <VStack align="stretch" spacing={5} p={8}>
      <Box alignSelf="center">
        <CoverImage book={book} coverVersion={book.coverVersion} />
      </Box>
      <Box>
        <Text fontSize="xs" letterSpacing="0.14em" textTransform="uppercase" color="dustyRose">
          {label}
        </Text>
        <Heading as="h1" size="xl" mt={1}>
          {book.title}
        </Heading>
        <Text fontFamily="heading" fontStyle="italic" fontSize="lg" color="mist" mt={1}>
          {book.author}
        </Text>
      </Box>
      {book.blurb && <Text whiteSpace="pre-wrap">{book.blurb}</Text>}
      <ProgressStepper
        bookId={book.id}
        totalChapters={book.totalChapters}
        initialFinished={finished}
        sections={sections}
        saveProgress={setProgressAction}
      />
    </VStack>
  )
}
