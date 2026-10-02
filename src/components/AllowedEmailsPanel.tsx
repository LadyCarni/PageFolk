import { Box, Button, Flex, Heading, Input, Text, VStack } from '@chakra-ui/react'
import { CARD_PROPS } from '@/components/adminStyles'
import { addAllowedEmailAction, removeAllowedEmailAction } from '@/app/admin/actions'

// Admin only: who may sign in. The page only renders this, and only fetches emails, for admins.
export function AllowedEmailsPanel({ emails }: { emails: string[] }) {
  return (
    <Box as="section" aria-labelledby="allowed-heading" mt={12} maxW="2xl" {...CARD_PROPS}>
      <Heading as="h2" id="allowed-heading" size="lg">
        Allowed emails
      </Heading>
      <Text color="mist" mt={2}>
        Anyone on this list can sign in with Google.
      </Text>
      <form action={addAllowedEmailAction}>
        <Flex gap={3} mt={5} wrap="wrap">
          <Input
            name="email"
            type="email"
            placeholder="member@example.com"
            aria-label="Email to allow"
            required
            flex="1"
            minW="200px"
            borderRadius="full"
          />
          <Button type="submit" borderRadius="full" px={6}>
            Add
          </Button>
        </Flex>
      </form>
      {emails.length === 0 ? (
        <Text mt={5} color="mist" fontStyle="italic">
          No one has been added yet.
        </Text>
      ) : (
        <VStack as="ul" listStyleType="none" align="stretch" spacing={0} mt={5} mb={0} mx={0} p={0}>
          {emails.map((email) => (
            <Flex
              as="li"
              key={email}
              justify="space-between"
              align="center"
              gap={3}
              py={2}
              borderBottomWidth="1px"
              borderColor="divider"
            >
              <Text wordBreak="break-all">{email}</Text>
              <form
                action={async () => {
                  'use server'
                  await removeAllowedEmailAction(email)
                }}
              >
                <Button type="submit" size="sm" variant="link" color="danger" aria-label={`Remove ${email}`}>
                  Remove
                </Button>
              </form>
            </Flex>
          ))}
        </VStack>
      )}
    </Box>
  )
}
