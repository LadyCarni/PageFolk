import { HStack, Text, VisuallyHidden } from '@chakra-ui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCommentDots } from '@fortawesome/free-solid-svg-icons'
import { formatRelativeTime } from '@/lib/time'

export function SectionActivity({ postCount, lastPostAt }: { postCount: number; lastPostAt: Date | null }) {
  return (
    <HStack spacing={3} fontSize="sm" color="brand.500">
      <HStack spacing={1}>
        <FontAwesomeIcon icon={faCommentDots} color="#c25a5d" aria-hidden />
        <Text as="span">{postCount}</Text>
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
