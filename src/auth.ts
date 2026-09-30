import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { prisma } from '@/lib/db'
import { isEmailAllowed } from '@/lib/allowlist'
import { isAdminEmail } from '@/lib/admin'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  pages: { signIn: '/sign-in' },
  session: { strategy: 'jwt' },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false
      return isEmailAllowed(user.email)
    },
    async jwt({ token }) {
      if (token.email) {
        const dbUser = await prisma.user.upsert({
          where: { email: token.email },
          update: {
            name: token.name ?? undefined,
            avatarUrl: (token.picture as string | undefined) ?? undefined,
          },
          create: {
            email: token.email,
            name: token.name ?? undefined,
            avatarUrl: (token.picture as string | undefined) ?? undefined,
            googleId: (token.sub as string) ?? token.email,
          },
        })
        token.userId = dbUser.id
        token.isAdmin = isAdminEmail(dbUser.email)
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string
        session.user.isAdmin = Boolean(token.isAdmin)
      }
      return session
    },
    authorized({ auth }) {
      return Boolean(auth?.user)
    },
  },
})
