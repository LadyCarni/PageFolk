import NextLink from 'next/link'
import { Charis_SIL } from 'next/font/google'
import { Box, Button, HStack, Link } from '@chakra-ui/react'
import { signOut } from '@/auth'

const charisSIL = Charis_SIL({ subsets: ['latin'], weight: ['400', '700'] })

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
            className={charisSIL.className}
          >
            PageFolk
          </Link>
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
