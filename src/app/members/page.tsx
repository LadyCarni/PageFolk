import { Box, Flex, Heading, SimpleGrid, Text } from '@chakra-ui/react'
import { requireUser } from '@/lib/session'
import { listMembers } from '@/lib/members'
import { UserAvatar } from '@/components/UserAvatar'

export default async function MembersPage() {
  await requireUser()
  const members = await listMembers()

  return (
    <Box p={{ base: 6, md: 10 }}>
      <Heading as="h1" size="xl">
        Members
      </Heading>
      <Text mt={2} color="mist">
        {members.length} {members.length === 1 ? 'member' : 'members'}
      </Text>
      <SimpleGrid as="ul" listStyleType="none" minChildWidth="200px" spacing={4} mt={8} p={0}>
        {members.map((member) => (
          <Flex
            as="li"
            key={member.id}
            gap={3}
            align="center"
            p={4}
            bg="velvet"
            borderWidth="1px"
            borderColor="border"
            borderRadius="xl"
          >
            <UserAvatar user={member} />
            <Text fontFamily="heading" fontSize="xl" fontWeight={600} color="parchment">
              {member.name ?? 'Member'}
            </Text>
          </Flex>
        ))}
      </SimpleGrid>
    </Box>
  )
}
