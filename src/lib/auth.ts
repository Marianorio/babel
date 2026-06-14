import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"
import type { NextAuthConfig } from "next-auth"

const hasGoogle =
  process.env.AUTH_GOOGLE_ID &&
  process.env.AUTH_GOOGLE_SECRET &&
  process.env.AUTH_GOOGLE_ID !== "pon-tu-client-id-aqui"

export const authConfig: NextAuthConfig = {
  providers: [
    ...(hasGoogle
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID!,
            clientSecret: process.env.AUTH_GOOGLE_SECRET!,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const email = credentials.email as string
        const password = credentials.password as string

        const user = await prisma.user.findUnique({
          where: { email },
        })

        if (!user || !user.password) return null

        const isValid = await bcrypt.compare(password, user.password)
        if (!isValid) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          console.log("🔍 Google signIn - user:", JSON.stringify({ email: user.email, name: user.name, id: user.id }))
          console.log("🔍 Google signIn - account:", JSON.stringify({ provider: account.provider, providerAccountId: account.providerAccountId, type: account.type }))

          const existing = await prisma.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: "google",
                providerAccountId: account.providerAccountId,
              },
            },
            include: { user: true },
          })

          if (existing?.user) {
            console.log("✅ Account + user found, returning true")
            return true
          }

          // Orphaned account (user was deleted) → clean it up
          if (existing && !existing.user) {
            console.log("🧹 Cleaning up orphaned account")
            await prisma.account.delete({ where: { id: existing.id } })
          }

          const email = user.email
          if (!email) {
            console.error("❌ Google signIn: no email returned")
            return false
          }

          let dbUser = await prisma.user.findUnique({ where: { email } })

          if (!dbUser) {
            dbUser = await prisma.user.create({
              data: {
                name: user.name || "User",
                email,
                image: user.image,
              },
            })
            console.log("✅ Created new user:", dbUser.id)
          }

          await prisma.account.create({
            data: {
              userId: dbUser.id,
              type: account.type,
              provider: "google",
              providerAccountId: account.providerAccountId,
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
            },
          })
          console.log("✅ Account linked, returning true")
          return true
        } catch (e) {
          console.error("❌ Google signIn error:", e instanceof Error ? e.message : e)
          return false
        }
      }
      return true
    },
    async jwt({ token, user, account }) {
      if (user && account?.provider === "google") {
        // Look up user via Account → User relationship (more reliable than email)
        const dbAccount = await prisma.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: "google",
              providerAccountId: account.providerAccountId,
            },
          },
          include: { user: true },
        }).catch(() => null)

        if (dbAccount?.user) {
          token.id = dbAccount.user.id
          console.log("🔑 JWT token set for Google user:", dbAccount.user.id)
        } else {
          console.error("❌ JWT: no user found for providerAccountId:", account.providerAccountId)
        }
      } else if (user) {
        token.id = user.id
        console.log("🔑 JWT token set for credentials user:", user.id)
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/error",
  },
  session: {
    strategy: "jwt",
  },
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
