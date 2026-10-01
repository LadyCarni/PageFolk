import { Flex } from '@chakra-ui/react'
import { avatarColorIndex, getInitials } from '@/lib/initials'

// Light pastels; initials use the dark brand color for contrast.
const AVATAR_COLORS = ['#d5b0c0', '#f3dde9', '#f6f1e8', '#b6c4cf', '#9a9cad']

export function UserAvatar({
  user,
  size = 40,
}: {
  user: { id: string; name: string | null }
  size?: number
}) {
  return (
    <Flex
      aria-hidden
      flexShrink={0}
      align="center"
      justify="center"
      boxSize={`${size}px`}
      borderRadius="full"
      bg={AVATAR_COLORS[avatarColorIndex(user.id, AVATAR_COLORS.length)]}
      color="brand.900"
      fontSize={`${Math.round(size * 0.55)}px`}
      fontFamily="heading"
      fontWeight="bold"
      lineHeight="1"
    >
      {getInitials(user.name)}
    </Flex>
  )
}
