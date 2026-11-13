'use client'

import { useEffect, useState } from 'react'
import NextLink from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { Box, HStack, Link, Menu, MenuButton, MenuItem, MenuList } from '@chakra-ui/react'
import { activeNavHref, bookshelfHref, type NavHref } from '@/lib/nav'

export const LINKS: { href: NavHref; label: string }[] = [
  { href: '/', label: 'This month' },
  { href: '/members', label: 'Members' },
  { href: '/whats-new', label: "What's new" },
]

export const BOOKSHELF_LINKS = [
  { href: '/shelf', label: 'Our shelf' },
  { href: '/long-list', label: 'The Long List' },
] as const

// Every nav item is the same box: room for the active underline below, matched by an invisible
// border and padding above, so the label sits in the vertical middle of the nav bar.
const UNDERLINE_BOX = {
  py: 1,
  borderTopWidth: '1px',
  borderBottomWidth: '1px',
  borderTopColor: 'transparent',
} as const

export function NavDot() {
  return (
    <Box
      aria-hidden
      position="absolute"
      top="3px"
      right="-10px"
      boxSize="8px"
      borderRadius="full"
      bg="dustyRose"
      boxShadow="0 0 0 2px var(--chakra-colors-midnightPlum)"
    />
  )
}

// Shared by the desktop links and the mobile menu.
export function useNavState(badges: { whatsNew: boolean }) {
  const pathname = usePathname()
  const active = activeNavHref(pathname)
  // The root layout does not re-render on client navigation, so remember the visit to hide the dot.
  const [visitedWhatsNew, setVisitedWhatsNew] = useState(false)
  useEffect(() => {
    if (active === '/whats-new') setVisitedWhatsNew(true)
  }, [active])
  const showWhatsNewDot = badges.whatsNew && !visitedWhatsNew && active !== '/whats-new'
  return { pathname, active, showWhatsNewDot }
}

type MenuEntry = { href: string; label: ReactNode }

// A nav-bar dropdown that looks like the other links: gold underline when its section is active.
function NavMenu({
  label,
  isActive,
  items,
  dot,
  ariaLabel,
  currentHref,
  placement = 'bottom-start',
}: {
  label: string
  isActive: boolean
  items: readonly MenuEntry[]
  dot?: boolean
  ariaLabel?: string
  currentHref?: string | null
  placement?: 'bottom-start' | 'bottom-end'
}) {
  return (
    <Menu placement={placement}>
      <MenuButton
        type="button"
        position="relative"
        fontSize="inherit"
        fontWeight="inherit"
        lineHeight="inherit"
        aria-label={ariaLabel}
        color={isActive ? 'antiqueGold' : 'body'}
        {...UNDERLINE_BOX}
        borderBottomColor={isActive ? 'antiqueGold' : 'transparent'}
        _hover={{ color: isActive ? 'antiqueGold' : 'parchment', textDecoration: 'none' }}
      >
        {label}
        {dot && <NavDot />}
      </MenuButton>
      <MenuList bg="velvet" borderColor="border" minW="12rem" py={2}>
        {items.map(({ href, label: itemLabel }) => {
          const current = currentHref === href
          return (
            <MenuItem
              key={href}
              as={NextLink}
              href={href}
              aria-current={current ? 'page' : undefined}
              bg="transparent"
              color={current ? 'antiqueGold' : 'parchment'}
              _hover={{ bg: 'mulberry' }}
              _focus={{ bg: 'mulberry' }}
            >
              {itemLabel}
            </MenuItem>
          )
        })}
      </MenuList>
    </Menu>
  )
}

export function NavLinks({ isAdmin, badges }: { isAdmin: boolean; badges: { whatsNew: boolean; admin: boolean } }) {
  const { pathname, active, showWhatsNewDot } = useNavState(badges)
  const [thisMonth, ...rest] = LINKS

  const renderLink = ({ href, label }: (typeof LINKS)[number]) => (
    <li key={href}>
      <Link
        as={NextLink}
        href={href}
        position="relative"
        aria-current={active === href ? 'page' : undefined}
        aria-label={href === '/whats-new' && showWhatsNewDot ? "What's new, new updates" : undefined}
        color={active === href ? 'antiqueGold' : 'body'}
        display="inline-block"
        {...UNDERLINE_BOX}
        borderBottomColor={active === href ? 'antiqueGold' : 'transparent'}
        _hover={{ color: active === href ? 'antiqueGold' : 'parchment', textDecoration: 'none' }}
      >
        {label}
        {href === '/whats-new' && showWhatsNewDot && <NavDot />}
      </Link>
    </li>
  )

  return (
    <Box as="nav" aria-label="Main" flex={{ base: 1, lg: 'none' }}>
      <HStack
        as="ul"
        listStyleType="none"
        spacing={{ base: 3, md: 6 }}
        justify={{ base: 'space-between', lg: 'flex-start' }}
        align="center"
        m={0}
        p={0}
      >
        {renderLink(thisMonth)}
        <li>
          <NavMenu
            label="Bookshelf"
            isActive={active === '/shelf'}
            items={BOOKSHELF_LINKS}
            currentHref={bookshelfHref(pathname)}
          />
        </li>
        {rest.map(renderLink)}
        {isAdmin && (
          <li>
            <NavMenu
              label="Admin"
              isActive={active === '/admin'}
              ariaLabel={badges.admin ? 'Admin, requests to review' : undefined}
              dot={badges.admin}
              placement="bottom-end"
              items={[
                { href: '/admin', label: 'Books & club' },
                { href: '/admin/feature-requests', label: 'Feature requests' },
              ]}
            />
          </li>
        )}
      </HStack>
    </Box>
  )
}
