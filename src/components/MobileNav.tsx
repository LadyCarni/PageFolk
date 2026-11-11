'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import NextLink from 'next/link'
import { Box, Button, Collapse, Flex, IconButton, Link, Text, useOutsideClick } from '@chakra-ui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBars, faXmark } from '@fortawesome/free-solid-svg-icons'
import { BOOKSHELF_LINKS, LINKS, NavDot, useNavState } from '@/components/NavLinks'
import { bookshelfHref } from '@/lib/nav'
import { UserAvatar } from '@/components/UserAvatar'

const ADMIN_LINKS = [
  { href: '/admin', label: 'Books & club' },
  { href: '/admin/feature-requests', label: 'Feature requests' },
] as const

function PanelLink({
  href,
  isActive,
  onNavigate,
  children,
}: {
  href: string
  isActive: boolean
  onNavigate: () => void
  children: ReactNode
}) {
  return (
    <Link
      as={NextLink}
      href={href}
      onClick={onNavigate}
      aria-current={isActive ? 'page' : undefined}
      display="block"
      py={3}
      px={4}
      borderLeftWidth="3px"
      borderLeftColor={isActive ? 'antiqueGold' : 'transparent'}
      color={isActive ? 'antiqueGold' : 'body'}
      _hover={{ color: isActive ? 'antiqueGold' : 'parchment', textDecoration: 'none', bg: 'velvet' }}
    >
      {children}
    </Link>
  )
}

// One menu for everything below md: the page links, the admin pages and signing out.
export function MobileNav({
  user,
  badges,
  signOutAction,
}: {
  user: { id: string; name?: string | null; isAdmin: boolean }
  badges: { whatsNew: boolean; admin: boolean }
  signOutAction: () => Promise<void>
}) {
  const { pathname, active, showWhatsNewDot } = useNavState(badges)
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const close = () => setOpen(false)

  useEffect(() => setOpen(false), [pathname])
  useOutsideClick({ ref: wrapperRef, handler: close, enabled: open })
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const showAdminDot = user.isAdmin && badges.admin
  const hasDot = showWhatsNewDot || showAdminDot
  const adminActiveHref = pathname.startsWith('/admin/feature-requests') ? '/admin/feature-requests' : '/admin'

  const renderLinks = (links: typeof LINKS) =>
    links.map(({ href, label }) => (
      <li key={href}>
        <PanelLink href={href} isActive={active === href} onNavigate={close}>
          <Box as="span" position="relative">
            {label}
            {href === '/whats-new' && showWhatsNewDot && <NavDot />}
          </Box>
        </PanelLink>
      </li>
    ))

  return (
    <Box ref={wrapperRef} display={{ base: 'block', md: 'none' }} flexShrink={0}>
      <IconButton
        ref={buttonRef}
        aria-label={hasDot ? 'Menu, new updates' : 'Menu'}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        variant="ghost"
        color={open ? 'antiqueGold' : 'parchment'}
        fontSize="xl"
        boxSize="44px"
        _hover={{ bg: 'velvet' }}
        _active={{ bg: 'velvet' }}
        icon={
          <Box as="span" position="relative" display="inline-flex">
            <FontAwesomeIcon icon={open ? faXmark : faBars} fixedWidth />
            {hasDot && !open && <NavDot />}
          </Box>
        }
      />
      {/* Positioned against the header, so the panel spans its full width just below it. */}
      <Box
        id={panelId}
        position="absolute"
        top="100%"
        left={0}
        right={0}
        zIndex="dropdown"
      >
        <Collapse in={open} unmountOnExit>
          <Box
            as="nav"
            aria-label="Main"
            bg="midnightPlum"
            borderBottomWidth="1px"
            borderColor="divider"
            boxShadow="0 12px 24px rgba(0, 0, 0, 0.35)"
            py={2}
          >
            <Box as="ul" listStyleType="none" m={0} p={0}>
              {renderLinks(LINKS.slice(0, 1))}
              <li>
                <Text
                  px={4}
                  pt={3}
                  pb={1}
                  fontSize="xs"
                  textTransform="uppercase"
                  letterSpacing="wider"
                  color="mist"
                >
                  Bookshelf
                </Text>
                <Box as="ul" listStyleType="none" m={0} p={0}>
                  {BOOKSHELF_LINKS.map(({ href, label }) => (
                    <li key={href}>
                      <PanelLink href={href} isActive={bookshelfHref(pathname) === href} onNavigate={close}>
                        {label}
                      </PanelLink>
                    </li>
                  ))}
                </Box>
              </li>
              {renderLinks(LINKS.slice(1))}
            </Box>
            {user.isAdmin && (
              <Box borderTopWidth="1px" borderColor="divider" mt={2} pt={2}>
                <Text
                  px={4}
                  pt={1}
                  pb={1}
                  fontSize="xs"
                  textTransform="uppercase"
                  letterSpacing="wider"
                  color="mist"
                >
                  <Box as="span" position="relative">
                    Admin
                    {showAdminDot && <NavDot />}
                  </Box>
                </Text>
                <Box as="ul" listStyleType="none" m={0} p={0}>
                  {ADMIN_LINKS.map(({ href, label }) => (
                    <li key={href}>
                      <PanelLink
                        href={href}
                        isActive={active === '/admin' && adminActiveHref === href}
                        onNavigate={close}
                      >
                        {label}
                      </PanelLink>
                    </li>
                  ))}
                </Box>
              </Box>
            )}
            <Flex
              align="center"
              justify="space-between"
              gap={3}
              borderTopWidth="1px"
              borderColor="divider"
              mt={2}
              pt={3}
              pb={1}
              px={4}
            >
              <Flex align="center" gap={3} minW={0}>
                <UserAvatar user={{ id: user.id, name: user.name ?? null }} size={32} />
                {user.name && (
                  <Text color="mist" fontSize="sm" isTruncated>
                    {user.name}
                  </Text>
                )}
              </Flex>
              <form action={signOutAction}>
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  color="parchment"
                  flexShrink={0}
                  _hover={{ bg: 'velvet' }}
                >
                  Sign out
                </Button>
              </form>
            </Flex>
          </Box>
        </Collapse>
      </Box>
    </Box>
  )
}
