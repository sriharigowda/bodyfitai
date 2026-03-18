import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import type { NextAuthOptions } from 'next-auth'

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
  ],
  callbacks: {
    async session({ session }) {
      return session
    },
  },
  pages: {
    signIn: '/',
  },
  logger: {
    error() {},
    warn() {},
    debug() {},
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }