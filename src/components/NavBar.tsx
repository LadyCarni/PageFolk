import NextLink from 'next/link'
import { Box, Button, HStack, Image, Link } from '@chakra-ui/react'
import { signOut } from '@/auth'

export function NavBar({ isAdmin }: { isAdmin: boolean }) {
  return (
    <Box as="nav" bg="midnightPlum" borderBottomWidth="1px" borderColor="divider" px={4} py={3}>
      <HStack justify="space-between">
        <HStack spacing={4}>
          <Link
            as={NextLink}
            href="/"
            color="antiqueGold"
            _hover={{ textDecoration: 'none' }}
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
          <Box aria-hidden boxSize="0.5em" bg="antiqueGold" transform="rotate(45deg)" />
          <Link as={NextLink} href="/past-books" color="parchment" _hover={{ color: 'antiqueGold' }}>
            Past books
          </Link>
          {isAdmin ? (
            <Link as={NextLink} href="/admin" color="parchment" _hover={{ color: 'antiqueGold' }}>
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
          <Button type="submit" size="sm" variant="link" color="mist">
            Sign out
          </Button>
        </form>
      </HStack>
    </Box>
  )
}
