import { auth } from "@/lib/auth"

export default auth(async (req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth

  // Let API routes through
  if (pathname.startsWith("/api/")) {
    return
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
