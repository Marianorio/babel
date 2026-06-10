import createMiddleware from "next-intl/middleware"
import { auth } from "@/lib/auth"

const intlMiddleware = createMiddleware({
  locales: ["es", "en"],
  defaultLocale: "es",
  localeDetection: true,
})

export default auth(async (req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth

  // Let API routes through without any processing
  if (pathname.startsWith("/api/")) {
    return
  }

  // Apply next-intl locale handling
  const intlResponse = intlMiddleware(req)
  if (intlResponse) {
    if (intlResponse.status === 302 || intlResponse.status === 307) {
      return intlResponse
    }
  }

  // Auth protection
  const publicPaths = ["/", "/login", "/register"]

  if (publicPaths.some((p) => pathname === p)) {
    if (isLoggedIn && (pathname === "/login" || pathname === "/register")) {
      return Response.redirect(new URL("/dashboard", req.url))
    }
    return
  }

  if (!isLoggedIn) {
    return Response.redirect(new URL("/login", req.url))
  }
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
