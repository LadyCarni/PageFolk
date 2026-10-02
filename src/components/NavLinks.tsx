'use client'

import NextLink from 'next/link'
import { usePathname } from 'next/navigation'
import { HStack, Link } from '@chakra-ui/react'
import { activeNavHref, type NavHref } from '@/lib/nav'

const LINKS: { href: NavHref; label: string }[] = [
  { href: '/', label: 'This month' },
  { href: '/shelf', label: 'Our shelf' },
  { href: '/members', label: 'Members' },
]

export function NavLinks({ isAdmin }: { isAdmin: boolean }) {
  const active = activeNavHref(usePathname())
  const links = isAdmin ? [...LINKS, { href: '/admin' as NavHref, label: 'Admin' }] : LINKS

  return (
    <HStack as="ul" listStyleType="none" spacing={{ base: 4, md: 6 }} m={0} p={0}>
      {links.map(({ href, label }) => (
        <li key={href}>
          <Link
            as={NextLink}
            href={href}
            aria-current={active === href ? 'page' : undefined}
            color={active === href ? 'antiqueGold' : 'body'}
            pb={1}
            borderBottomWidth="1px"
            borderColor={active === href ? 'antiqueGold' : 'transparent'}
            _hover={{ color: active === href ? 'antiqueGold' : 'parchment', textDecoration: 'none' }}
          >
            {label}
          </Link>
        </li>
      ))}
    </HStack>
  )
}
