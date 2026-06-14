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

  console.log(`🔍 Middleware: path=${pathname} isLoggedIn=${isLoggedIn} auth=${!!req.auth}`)

  // Let API routes through without any processing
  if (pathname.startsWith("/api/")) {
    return
  }

  // Apply next-intl locale handling
  const intlResponse = intlMiddleware(req)
  if (intlResponse) {
    if (intlResponse.status === 302 || intlResponse.status === 307) {
      console.log(`🔍 intl redirect: ${intlResponse.status} to ${intlResponse.headers.get("location")}`)
      return intlResponse
    }
  }

  // Auth protection
  const publicPaths = ["/", "/login", "/register"]

  if (publicPaths.some((p) => pathname === p)) {
    if (isLoggedIn && (pathname === "/login" || pathname === "/register")) {
      console.log("🔍 User is logged in, redirecting from login to dashboard")
      return Response.redirect(new URL("/dashboard", req.url))
    }
    return
  }

  if (!isLoggedIn) {
    console.log("🔍 Not logged in, redirecting to login")
    return Response.redirect(new URL("/login", req.url))
  }

  console.log("🔍 Allowing through to:", pathname)
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
