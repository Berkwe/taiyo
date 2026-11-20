import { getTrustedOrigins } from "./trusted-origins"

const accountVerificationPaths = new Set([
  "/api/auth/sign-in/email",
  "/api/auth/sign-up/email",
])

export const getVerificationEmailUrl = (
  originalUrl: string,
  request: Request | undefined,
  isDevelopment: boolean,
) => {
  const verificationUrl = new URL(originalUrl)
  const requestPath = request ? new URL(request.url).pathname : null

  if (!requestPath || !accountVerificationPaths.has(requestPath)) {
    return verificationUrl.toString()
  }

  verificationUrl.searchParams.set(
    "callbackURL",
    "/auth/verify-email?verified=1",
  )

  const [developmentOrigin] = getTrustedOrigins(request, [], isDevelopment)
  if (developmentOrigin) {
    const origin = new URL(developmentOrigin)
    verificationUrl.protocol = origin.protocol
    verificationUrl.host = origin.host
  }

  return verificationUrl.toString()
}
