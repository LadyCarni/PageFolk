import { Button, Heading, HStack, Input, Text, VStack } from '@chakra-ui/react'
import { requireAdmin } from '@/lib/session'
import { listAllowedEmails } from '@/lib/allowlist'
import { addAllowedEmailAction, removeAllowedEmailAction } from '../actions'

export default async function AllowedEmailsPage() {
  await requireAdmin()
  const emails = await listAllowedEmails()

  return (
    <VStack align="stretch" p={8} spacing={4}>
      <Heading size="lg">
        Allowed members
      </Heading>
      <form action={addAllowedEmailAction}>
        <HStack>
          <Input name="email" type="email" placeholder="member@example.com" required />
          <Button type="submit">
            Add
          </Button>
        </HStack>
      </form>
      <VStack as="ul" align="stretch" spacing={1}>
        {emails.map((email) => (
          <HStack as="li" key={email} justify="space-between" borderBottomWidth="1px" borderColor="divider" py={1}>
            <Text>{email}</Text>
            <form
              action={async () => {
                'use server'
                await removeAllowedEmailAction(email)
              }}
            >
              <Button type="submit" size="sm" variant="link" color="danger">
                Remove
              </Button>
            </form>
          </HStack>
        ))}
      </VStack>
    </VStack>
  )
}
