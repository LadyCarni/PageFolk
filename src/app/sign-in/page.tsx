import { Button, HStack, Heading, Image, Link, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { redirect } from 'next/navigation'
import { auth, signIn } from '@/auth'
import { signInRedirectPath } from '@/lib/sign-in-redirect'

export default async function SignInPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const isAccessDenied = searchParams.error === 'AccessDenied'
  const redirectTo = signInRedirectPath(searchParams.callbackUrl)

  const session = await auth()
  if (session?.user) redirect(redirectTo)

  return (
    <VStack minH="100vh" justify="center" spacing={4} p={8}>
      <Image src="/pagefolk.svg" alt="" boxSize="96px" />
      <Heading size="lg">
        PageFolk
      </Heading>
      <Text color="dustyRose" fontSize="lg" fontStyle="italic">
        Every page, together.
      </Text>
      {isAccessDenied ? (
        <Text color="dustyRose" fontWeight="bold" textAlign="center" maxW="md">
          Thanks for signing in! Your request is with Caryn. Once you&apos;re approved, just sign in again.
        </Text>
      ) : (
        <Text color="mist" textAlign="center">Sign in with Google to join the club.</Text>
      )}
      <form
        action={async () => {
          'use server'
          await signIn('google', { redirectTo })
        }}
      >
        <Button type="submit">
          Sign in with Google
        </Button>
      </form>
      <HStack spacing={4}>
        <Link as={NextLink} href="/privacy" color="mist" fontSize="sm">
          Privacy
        </Link>
        <Link as={NextLink} href="/terms" color="mist" fontSize="sm">
          Terms
        </Link>
      </HStack>
    </VStack>
  )
}
