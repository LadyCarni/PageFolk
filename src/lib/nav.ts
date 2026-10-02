export type NavHref = '/' | '/shelf' | '/members' | '/admin'

export function activeNavHref(pathname: string): NavHref | null {
  const within = (base: string) => pathname === base || pathname.startsWith(`${base}/`)
  if (pathname === '/') return '/'
  if (within('/shelf')) return '/shelf'
  if (within('/members')) return '/members'
  if (within('/admin')) return '/admin'
  return null
}
