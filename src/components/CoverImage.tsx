import { Box, Image, Text } from '@chakra-ui/react'

// The uploaded cover when there is one; otherwise a generated Claret panel with a double gold frame.
export function CoverImage({
  book,
  coverVersion,
  width = '180px',
}: {
  book: { id: string; title: string; author: string }
  coverVersion: number | null
  width?: string
}) {
  if (coverVersion !== null) {
    return (
      <Image
        src={`/books/${book.id}/cover?v=${coverVersion}`}
        alt={`Cover of ${book.title}`}
        w={width}
        borderRadius="md"
        boxShadow="xl"
      />
    )
  }

  return (
    <Box
      role="img"
      aria-label={`Cover of ${book.title}`}
      w={width}
      aspectRatio={2 / 3}
      bg="claret"
      borderRadius="md"
      boxShadow="xl"
      p="6%"
    >
      <Box
        h="100%"
        borderWidth="3px"
        borderStyle="double"
        borderColor="antiqueGold"
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        textAlign="center"
        px={3}
        gap={3}
      >
        <Box aria-hidden boxSize="8px" bg="antiqueGold" transform="rotate(45deg)" />
        <Text fontFamily="heading" fontWeight={600} fontSize="xl" lineHeight="1.15" color="antiqueGold">
          {book.title}
        </Text>
        <Box aria-hidden w="40%" h="1px" bg="antiqueGold" opacity={0.6} />
        <Text fontSize="xs" color="parchment">
          {book.author}
        </Text>
      </Box>
    </Box>
  )
}
