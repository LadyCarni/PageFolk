import { Button, Heading, HStack, Input, Text, VStack } from '@chakra-ui/react'
import { requireAdmin } from '@/lib/session'
import { listAllowedEmails } from '@/lib/allowlist'
import { addAllowedEmailAction, removeAllowedEmailAction } from '../actions'

export default async function AllowedEmailsPage() {
  await requireAdmin()
  const emails = await listAllowedEmails()

  return (
    <VStack align="stretch" p={8} spacing={4}>
      <Heading size="lg" color="brand.900">
        Allowed members
      </Heading>
      <form action={addAllowedEmailAction}>
        <HStack>
          <Input name="email" type="email" placeholder="member@example.com" required />
          <Button type="submit" bg="brand.700" color="white" _hover={{ bg: 'brand.900' }}>
            Add
          </Button>
        </HStack>
      </form>
      <VStack as="ul" align="stretch" spacing={1}>
        {emails.map((email) => (
          <HStack as="li" key={email} justify="space-between" borderBottomWidth="1px" py={1}>
            <Text>{email}</Text>
            <form
              action={async () => {
                'use server'
                await removeAllowedEmailAction(email)
              }}
            >
              <Button type="submit" size="sm" variant="link" color="red.600">
                Remove
              </Button>
            </form>
          </HStack>
        ))}
      </VStack>
    </VStack>
  )
}
