const isPrivateDevelopmentHostname = (hostname: string) => {
  if (hostname === "localhost" || hostname === "::1") return true

  const parts = hostname.split(".").map(Number)
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false
  }

  const first = parts[0] ?? -1
  const second = parts[1] ?? -1

  return (
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 100 && second >= 64 && second <= 127)
  )
}

export const getTrustedOrigins = (
  request: Request | undefined,
  configuredOrigins: string[],
  isDevelopment: boolean,
) => {
  if (!isDevelopment || !request) return configuredOrigins

  const submittedOrigin = request.headers.get("origin")
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]
  const requestHost = forwardedHost?.trim() || request.headers.get("host")

  if (!submittedOrigin || !requestHost) return configuredOrigins

  try {
    const origin = new URL(submittedOrigin)
    const isHttp = origin.protocol === "http:" || origin.protocol === "https:"

    if (
      isHttp &&
      origin.host === requestHost &&
      isPrivateDevelopmentHostname(origin.hostname)
    ) {
      return [...new Set([...configuredOrigins, origin.origin])]
    }
  } catch {
    // Invalid origins are left for Better Auth to reject.
  }

  return configuredOrigins
}
