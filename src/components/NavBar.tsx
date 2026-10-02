import NextLink from 'next/link'
import { Box, Flex, HStack, Image, Link, Menu, MenuButton, MenuItem, MenuList, Text } from '@chakra-ui/react'
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
      {/* On large screens the header is one fixed-height row, so a long club name is cut short instead of wrapping. */}
      <Flex align="center" justify="space-between" wrap={{ base: 'wrap', lg: 'nowrap' }} gap={3} h="100%">
        <HStack spacing={4} minW={0}>
          <Link
            flexShrink={0}
            as={NextLink}
            href="/"
            color="antiqueGold"
            _hover={{ textDecoration: 'none' }}
            display="flex"
            alignItems="center"
            gap={2}
          >
            <Image src="/pagefolk.svg" alt="" boxSize="35px" />
            {/* 2.125rem is 34px at the default root size. */}
            <Text
              as="span"
              color="antiqueGold"
              fontFamily="heading"
              fontStyle="italic"
              fontWeight={600}
              fontSize="2.125rem"
              lineHeight="1"
            >
              PageFolk
            </Text>
          </Link>
          <Box aria-hidden flexShrink={0} boxSize="8px" bg="borderMuted" transform="rotate(45deg)" />
          {clubName && (
            <Text fontFamily="heading" fontSize="lg" color="mist" minW={0} isTruncated title={clubName}>
              {clubName}
            </Text>
          )}
        </HStack>
        <HStack spacing={{ base: 4, md: 6 }} flexShrink={0}>
          <NavLinks isAdmin={user.isAdmin} />
          <Menu placement="bottom-end">
            <MenuButton
              aria-label="Account menu"
              borderRadius="full"
              _hover={{ boxShadow: '0 0 0 2px var(--chakra-colors-antiqueGold)' }}
              _expanded={{ boxShadow: '0 0 0 2px var(--chakra-colors-antiqueGold)' }}
              _focusVisible={{ boxShadow: '0 0 0 2px var(--chakra-colors-antiqueGold)' }}
            >
              <UserAvatar user={{ id: user.id, name: user.name ?? null }} size={36} />
            </MenuButton>
            <MenuList bg="velvet" borderColor="border" minW="12rem" py={2}>
              {user.name && (
                <Text px={3} pb={2} mb={1} fontSize="sm" color="mist" borderBottomWidth="1px" borderColor="divider">
                  {user.name}
                </Text>
              )}
              <form
                action={async () => {
                  'use server'
                  await signOut()
                }}
              >
                <MenuItem
                  as="button"
                  type="submit"
                  bg="transparent"
                  color="parchment"
                  _hover={{ bg: 'mulberry' }}
                  _focus={{ bg: 'mulberry' }}
                >
                  Sign out
                </MenuItem>
              </form>
            </MenuList>
          </Menu>
        </HStack>
      </Flex>
    </Box>
  )
}
