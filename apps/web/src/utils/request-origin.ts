import type { NextRequest } from "next/server"

function firstForwardedValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null
}

export function publicRequestOrigins(request: NextRequest) {
  const origins = new Set([request.nextUrl.origin])
  const host =
    firstForwardedValue(request.headers.get("x-forwarded-host")) ??
    request.headers.get("host")
  const protocol =
    firstForwardedValue(request.headers.get("x-forwarded-proto")) ??
    request.nextUrl.protocol.replace(/:$/, "")

  if (host && /^(https?)$/.test(protocol)) {
    try {
      origins.add(new URL(`${protocol}://${host}`).origin)
    } catch {
      // An invalid forwarded host must not broaden the accepted origin set.
    }
  }

  return origins
}

export function isAllowedWriteOrigin(
  origin: string,
  expectedOrigins: ReadonlySet<string>,
) {
  try {
    return expectedOrigins.has(new URL(origin).origin)
  } catch {
    return false
  }
}
