import type { ReactNode } from 'react'
import { config } from '@fortawesome/fontawesome-svg-core'
import '@fortawesome/fontawesome-svg-core/styles.css'
import { Providers } from './providers'
import { auth } from '@/auth'
import { NavBar } from '@/components/NavBar'

// The stylesheet is imported above, so stop Font Awesome injecting it at runtime.
config.autoAddCss = false

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
