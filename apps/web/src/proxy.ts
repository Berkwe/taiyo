import { type NextRequest, NextResponse } from "next/server"

export default async function proxy(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const routeLocale = req.nextUrl.pathname.split("/")[1]
  const requestHeaders = new Headers(req.headers)
  if (routeLocale === "tr" || routeLocale === "en") {
    requestHeaders.set("x-novora-locale", routeLocale)
  }

  // User trying to access auth-related routes while logged in
  if (
    req.nextUrl.pathname.startsWith("/auth/") &&
    (await (await import("~/utils/get-session")).getSession())
  ) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  // Intercept better-auth API errors and redirect to the custom auth error page
  if (req.nextUrl.pathname.startsWith("/api/auth/error")) {
    const errorCode = searchParams.get("error")

    return NextResponse.redirect(
      new URL(`/auth/error?code=${errorCode}`, req.url),
    )
  }

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ["/tr/:path*", "/en/:path*", "/auth/:path*", "/api/auth/error"],
}
