export type NavHref = '/' | '/shelf' | '/members' | '/whats-new' | '/admin'

const within = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`)

export function activeNavHref(pathname: string): NavHref | null {
  const inUnder = (base: string) => within(pathname, base)
  if (pathname === '/') return '/'
  // The Bookshelf menu owns both the shelf and the Long List.
  if (inUnder('/shelf') || inUnder('/long-list')) return '/shelf'
  if (inUnder('/members')) return '/members'
  if (inUnder('/whats-new')) return '/whats-new'
  if (inUnder('/admin')) return '/admin'
  return null
}

// Which Bookshelf menu item is the current page, if any.
export function bookshelfHref(pathname: string): '/shelf' | '/long-list' | null {
  if (within(pathname, '/shelf')) return '/shelf'
  if (within(pathname, '/long-list')) return '/long-list'
  return null
}
