export { auth as middleware } from '@/auth'

export const config = {
  matcher: ['/((?!api/auth|sign-in|privacy|terms|_next/static|_next/image|favicon.ico|.*\\.svg$).*)'],
}
