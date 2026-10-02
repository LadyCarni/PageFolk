import { Box, Flex } from '@chakra-ui/react'
import type { Coverage } from '@/lib/chapters'

// One segment per section and per gap, sized by chapter count: gold where a section covers it.
export function CoverageBar({ coverage, label }: { coverage: Coverage; label: string }) {
  return (
    <Flex role="img" aria-label={label} gap="4px" h="6px">
      {coverage.segments.map((s) => (
        <Box
          key={s.start}
          flex={s.end - s.start + 1}
          borderRadius="full"
          bg={s.covered ? 'antiqueGold' : 'progressTodo'}
        />
      ))}
    </Flex>
  )
}
