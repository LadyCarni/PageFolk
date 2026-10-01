import type { ReactNode } from 'react'
import { config } from '@fortawesome/fontawesome-svg-core'
import '@fortawesome/fontawesome-svg-core/styles.css'
import { Cormorant_Garamond, Lora } from 'next/font/google'
import { ColorModeScript } from '@chakra-ui/react'
import { Providers } from './providers'
import { auth } from '@/auth'
import { NavBar } from '@/components/NavBar'

// The stylesheet is imported above, so stop Font Awesome injecting it at runtime.
config.autoAddCss = false

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-cormorant',
})
const lora = Lora({ subsets: ['latin'], variable: '--font-lora' })

export const metadata = { title: 'PageFolk' }

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await auth()

  return (
    <html lang="en" className={`${cormorant.variable} ${lora.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ColorModeScript initialColorMode="dark" />
        <Providers>
          {session?.user ? <NavBar isAdmin={Boolean(session.user.isAdmin)} /> : null}
          {children}
        </Providers>
      </body>
    </html>
  )
}
