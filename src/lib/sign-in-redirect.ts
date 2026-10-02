// Where to send someone after they sign in, from the sign-in page's `callbackUrl`.
// Only the path is kept, so the result always stays on this site.
export function signInRedirectPath(callbackUrl: string | string[] | undefined): string {
  if (typeof callbackUrl !== 'string' || callbackUrl === '') return '/'

  let url: URL
  try {
    url = new URL(callbackUrl, 'http://localhost')
  } catch {
    return '/'
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return '/'

  const path = url.pathname
  // A path starting with "//" would be read by the browser as another site.
  if (path.startsWith('//')) return '/'
  if (path === '/sign-in' || path.startsWith('/api/auth')) return '/'
  return `${path}${url.search}${url.hash}`
}
