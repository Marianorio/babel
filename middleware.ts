import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth(async (req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth

  // Let API routes through
  if (pathname.startsWith("/api/")) {
    return NextResponse.next()
  }

  // Auth protection
  const publicPaths = ["/", "/login", "/register"]

  if (publicPaths.some((p) => pathname === p)) {
    if (isLoggedIn && (pathname === "/login" || pathname === "/register")) {
      return Response.redirect(new URL("/dashboard", req.url))
    }
    return NextResponse.next()
  }

  if (!isLoggedIn) {
    return Response.redirect(new URL("/login", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
