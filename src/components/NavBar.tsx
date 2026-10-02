import NextLink from 'next/link'
import { Box, Button, Flex, HStack, Image, Link, Text } from '@chakra-ui/react'
import { signOut } from '@/auth'
import { NAV_HEIGHT_PX } from '@/lib/layout'
import { NavLinks } from '@/components/NavLinks'
import { UserAvatar } from '@/components/UserAvatar'

export function NavBar({
  user,
  clubName,
}: {
  user: { id: string; name?: string | null; isAdmin: boolean }
  clubName: string | null
}) {
  return (
    <Box
      as="header"
      bg="midnightPlum"
      borderBottomWidth="1px"
      borderColor="divider"
      px={{ base: 4, md: 8 }}
      py={{ base: 3, lg: 0 }}
      h={{ lg: `${NAV_HEIGHT_PX}px` }}
    >
      <Flex align="center" justify="space-between" wrap="wrap" gap={3} h="100%">
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
          {clubName && (
            <Text fontFamily="heading" fontSize="lg" color="mist" noOfLines={1}>
              {clubName}
            </Text>
          )}
        </HStack>
        <HStack spacing={{ base: 4, md: 6 }}>
          <NavLinks isAdmin={user.isAdmin} />
          <UserAvatar user={{ id: user.id, name: user.name ?? null }} size={36} />
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
      </Flex>
    </Box>
  )
}
