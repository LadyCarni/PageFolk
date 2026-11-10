'use client'

import { useEffect, useState } from 'react'
import NextLink from 'next/link'
import { usePathname } from 'next/navigation'
import { Box, HStack, Link, Menu, MenuButton, MenuItem, MenuList } from '@chakra-ui/react'
import { activeNavHref, type NavHref } from '@/lib/nav'

const LINKS: { href: NavHref; label: string }[] = [
  { href: '/', label: 'This month' },
  { href: '/shelf', label: 'Our shelf' },
  { href: '/members', label: 'Members' },
  { href: '/whats-new', label: "What's new" },
]

function NavDot() {
  return (
    <Box
      aria-hidden
      position="absolute"
      top="-2px"
      right="-10px"
      boxSize="8px"
      borderRadius="full"
      bg="dustyRose"
      boxShadow="0 0 0 2px var(--chakra-colors-midnightPlum)"
    />
  )
}

export function NavLinks({ isAdmin, badges }: { isAdmin: boolean; badges: { whatsNew: boolean; admin: boolean } }) {
  const pathname = usePathname()
  const active = activeNavHref(pathname)
  // The root layout does not re-render on client navigation, so remember the visit to hide the dot.
  const [visitedWhatsNew, setVisitedWhatsNew] = useState(false)
  useEffect(() => {
    if (active === '/whats-new') setVisitedWhatsNew(true)
  }, [active])
  const showWhatsNewDot = badges.whatsNew && !visitedWhatsNew && active !== '/whats-new'
  const adminActive = active === '/admin'

  return (
    <Box as="nav" aria-label="Main" flex={{ base: 1, lg: 'none' }}>
      <HStack
        as="ul"
        listStyleType="none"
        spacing={{ base: 3, md: 6 }}
        justify={{ base: 'space-between', lg: 'flex-start' }}
        m={0}
        p={0}
      >
        {LINKS.map(({ href, label }) => (
          <li key={href}>
            <Link
              as={NextLink}
              href={href}
              position="relative"
              aria-current={active === href ? 'page' : undefined}
              aria-label={href === '/whats-new' && showWhatsNewDot ? "What's new, new updates" : undefined}
              color={active === href ? 'antiqueGold' : 'body'}
              pb={1}
              borderBottomWidth="1px"
              borderColor={active === href ? 'antiqueGold' : 'transparent'}
              _hover={{ color: active === href ? 'antiqueGold' : 'parchment', textDecoration: 'none' }}
            >
              {label}
              {href === '/whats-new' && showWhatsNewDot && <NavDot />}
            </Link>
          </li>
        ))}
        {isAdmin && (
          <li>
            <Menu placement="bottom-end">
              <MenuButton
                type="button"
                position="relative"
                fontSize="inherit"
                fontWeight="inherit"
                aria-label={badges.admin ? 'Admin, requests to review' : undefined}
                color={adminActive ? 'antiqueGold' : 'body'}
                pb={1}
                borderBottomWidth="1px"
                borderColor={adminActive ? 'antiqueGold' : 'transparent'}
                _hover={{ color: adminActive ? 'antiqueGold' : 'parchment', textDecoration: 'none' }}
              >
                Admin
                {badges.admin && <NavDot />}
              </MenuButton>
              <MenuList bg="velvet" borderColor="border" minW="12rem" py={2}>
                <MenuItem
                  as={NextLink}
                  href="/admin"
                  bg="transparent"
                  color="parchment"
                  _hover={{ bg: 'mulberry' }}
                  _focus={{ bg: 'mulberry' }}
                >
                  Books &amp; club
                </MenuItem>
                <MenuItem
                  as={NextLink}
                  href="/admin/feature-requests"
                  bg="transparent"
                  color="parchment"
                  _hover={{ bg: 'mulberry' }}
                  _focus={{ bg: 'mulberry' }}
                >
                  Feature requests
                </MenuItem>
              </MenuList>
            </Menu>
          </li>
        )}
      </HStack>
    </Box>
  )
}
