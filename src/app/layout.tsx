import type { ReactNode } from 'react'
import { Providers } from './providers'
import { auth } from '@/auth'
import { NavBar } from '@/components/NavBar'

export const metadata = { title: 'PageFolk' }

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await auth()

  return (
    <html lang="en">
      <body>
        <Providers>
          {session?.user ? <NavBar isAdmin={Boolean(session.user.isAdmin)} /> : null}
          {children}
        </Providers>
      </body>
    </html>
  )
}
