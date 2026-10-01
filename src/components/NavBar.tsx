import NextLink from 'next/link'
import { Box, Button, HStack, Image, Link } from '@chakra-ui/react'
import { signOut } from '@/auth'

export function NavBar({ isAdmin }: { isAdmin: boolean }) {
  return (
    <Box as="nav" bg="brand.900" px={4} py={3}>
      <HStack justify="space-between">
        <HStack spacing={4}>
          <Link
            as={NextLink}
            href="/"
            color="white"
            fontWeight="bold"
            fontSize="1.25em"
            fontFamily="heading"
            display="flex"
            alignItems="center"
            gap={2}
          >
            <Image src="/pagefolk.svg" alt="" boxSize="1.75em" />
            PageFolk
          </Link>
          <Box aria-hidden boxSize="0.5em" bg="#d4b06a" transform="rotate(45deg)" />
          <Link as={NextLink} href="/past-books" color="brand.100">
            Past books
          </Link>
          {isAdmin ? (
            <Link as={NextLink} href="/admin" color="brand.100">
              Admin
            </Link>
          ) : null}
        </HStack>
        <form
          action={async () => {
            'use server'
            await signOut()
          }}
        >
          <Button type="submit" size="sm" variant="link" color="brand.100">
            Sign out
          </Button>
        </form>
      </HStack>
    </Box>
  )
}
