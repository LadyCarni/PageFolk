import { Box } from '@chakra-ui/react'
import { coverColor } from '@/lib/cover-color'

// The generated cover without its title and author, for spaces too small to hold text:
// the book's cover color, a double gold frame and the gold diamond in the middle.
// Sizes are in pixels because percentage padding resolves against the parent's width (a whole
// list row), not the cover's, which crushed the frame into the middle of the small cover.
export function CoverMark({ id, width, diamond }: { id: string; width: number; diamond: number }) {
  return (
    <Box
      aria-hidden
      flexShrink={0}
      w={`${width}px`}
      h={`${Math.round(width * 1.5)}px`}
      bg={coverColor(id)}
      borderRadius="sm"
      boxShadow="md"
      p={`${Math.max(2, Math.round(width * 0.06))}px`}
      display="flex"
    >
      <Box
        flex={1}
        borderWidth="3px"
        borderStyle="double"
        borderColor="antiqueGold"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Box boxSize={`${diamond}px`} bg="antiqueGold" transform="rotate(45deg)" />
      </Box>
    </Box>
  )
}
