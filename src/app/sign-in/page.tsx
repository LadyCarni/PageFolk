import { Button, Heading, Image, Text, VStack } from '@chakra-ui/react'
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
        <Text color="dustyRose" fontWeight="bold">
          You&apos;re not on the list — contact the admin to get access.
        </Text>
      ) : (
        <Text color="mist">Sign in with the Google account you were invited with.</Text>
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
    </VStack>
  )
}
