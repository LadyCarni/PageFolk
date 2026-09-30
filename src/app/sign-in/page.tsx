import { Button, Heading, Text, VStack } from '@chakra-ui/react'
import { signIn } from '@/auth'

export default function SignInPage() {
  return (
    <VStack minH="100vh" justify="center" spacing={4} p={8}>
      <Heading size="lg" color="brand.900">
        Book Club
      </Heading>
      <Text color="gray.600">Sign in with the Google account you were invited with.</Text>
      <form
        action={async () => {
          'use server'
          await signIn('google')
        }}
      >
        <Button type="submit" bg="brand.700" color="white" _hover={{ bg: 'brand.900' }}>
          Sign in with Google
        </Button>
      </form>
    </VStack>
  )
}
