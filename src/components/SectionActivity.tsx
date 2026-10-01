import { HStack, Text, VisuallyHidden } from '@chakra-ui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCommentDots } from '@fortawesome/free-solid-svg-icons'
import { formatRelativeTime } from '@/lib/time'

export function SectionActivity({ postCount, lastPostAt }: { postCount: number; lastPostAt: Date | null }) {
  return (
    <HStack spacing={3} fontSize="sm" color="mist">
      <HStack spacing={1}>
        <FontAwesomeIcon icon={faCommentDots} color="var(--chakra-colors-dustyRose)" aria-hidden />
        <Text as="span" fontFamily="heading" fontWeight="bold">
          {postCount}
        </Text>
        <VisuallyHidden>{postCount === 1 ? 'post' : 'posts'}</VisuallyHidden>
      </HStack>
      {lastPostAt && (
        <Text as="span">
          <VisuallyHidden>last post </VisuallyHidden>
          {formatRelativeTime(lastPostAt)}
        </Text>
      )}
    </HStack>
  )
}
