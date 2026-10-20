import { Avatar, Box, Button, Flex, Heading, Text, VStack } from '@chakra-ui/react'
import { CARD_PROPS } from '@/components/adminStyles'
import { approveAccessRequestAction, dismissAccessRequestAction } from '@/app/admin/actions'
import { formatRelativeTime } from '@/lib/time'
import type { AccessRequest } from '@/lib/access-requests'

// Admin only: people who signed in with Google but aren't allowed yet. Hidden when there are none.
export function AccessRequestsPanel({ requests }: { requests: AccessRequest[] }) {
  if (requests.length === 0) return null

  return (
    <Box as="section" aria-labelledby="requests-heading" mt={12} maxW="2xl" {...CARD_PROPS}>
      <Heading as="h2" id="requests-heading" size="lg">
        Waiting for approval
      </Heading>
      <Text color="mist" mt={2}>
        These people signed in with Google. Approve them and they can get in next time they sign in.
      </Text>
      <VStack as="ul" listStyleType="none" align="stretch" spacing={0} mt={5} mb={0} mx={0} p={0}>
        {requests.map((request) => (
          <Flex
            as="li"
            key={request.email}
            align="center"
            gap={3}
            py={3}
            wrap="wrap"
            borderBottomWidth="1px"
            borderColor="divider"
          >
            <Avatar size="sm" name={request.name ?? request.email} src={request.avatarUrl ?? undefined} />
            <Box flex="1" minW="160px">
              <Text fontWeight={600} color="parchment">
                {request.name ?? 'No name given'}
              </Text>
              <Text fontSize="sm" color="mist" wordBreak="break-all">
                {request.email} · {formatRelativeTime(request.requestedAt)}
              </Text>
            </Box>
            <Flex gap={3} align="center">
              <form
                action={async () => {
                  'use server'
                  await approveAccessRequestAction(request.email)
                }}
              >
                <Button type="submit" size="sm" borderRadius="full" px={5} aria-label={`Approve ${request.email}`}>
                  Approve
                </Button>
              </form>
              <form
                action={async () => {
                  'use server'
                  await dismissAccessRequestAction(request.email)
                }}
              >
                <Button type="submit" size="sm" variant="link" color="danger" aria-label={`Dismiss ${request.email}`}>
                  Dismiss
                </Button>
              </form>
            </Flex>
          </Flex>
        ))}
      </VStack>
    </Box>
  )
}
