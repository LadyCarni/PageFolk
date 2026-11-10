import { HStack, Text } from '@chakra-ui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCrown } from '@fortawesome/free-solid-svg-icons'

export function MemberRequestBadge() {
  return (
    <HStack
      as="span"
      display="inline-flex"
      spacing={1}
      px={2}
      borderWidth="1px"
      borderColor="antiqueGold"
      borderRadius="full"
      color="antiqueGold"
      verticalAlign="middle"
    >
      <FontAwesomeIcon icon={faCrown} size="xs" aria-hidden />
      <Text as="span" fontSize="xs" color="antiqueGold">
        Member request
      </Text>
    </HStack>
  )
}
