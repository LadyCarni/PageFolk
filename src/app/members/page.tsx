import { Box, Flex, Heading, SimpleGrid, Text } from '@chakra-ui/react'
import { requireUser } from '@/lib/session'
import { listMembers } from '@/lib/members'
import { UserAvatar } from '@/components/UserAvatar'
import { listAllowedEmails } from '@/lib/allowlist'
import { AllowedEmailsPanel } from '@/components/AllowedEmailsPanel'
import { listAccessRequests } from '@/lib/access-requests'
import { AccessRequestsPanel } from '@/components/AccessRequestsPanel'

export default async function MembersPage() {
  const user = await requireUser()
  // Emails and access requests are fetched only for admins, so members never receive them.
  const [members, allowedEmails, accessRequests] = await Promise.all([
    listMembers(),
    user.isAdmin ? listAllowedEmails() : Promise.resolve(null),
    user.isAdmin ? listAccessRequests() : Promise.resolve(null),
  ])

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
      {accessRequests && <AccessRequestsPanel requests={accessRequests} />}
      {allowedEmails && <AllowedEmailsPanel emails={allowedEmails} />}
    </Box>
  )
}
