import { cookies } from "next/headers"
import {
  type DebugViewerRole,
  debugViewerCookie,
  isLoopbackAuthUrl,
} from "~/features/debug/config"
import { isManagementRole } from "~/features/management/permissions"

export function isDebugMode() {
  return (
    process.env.NODE_ENV === "development" &&
    isLoopbackAuthUrl(process.env.BETTER_AUTH_URL)
  )
}

export async function getDebugViewerRole(): Promise<DebugViewerRole | null> {
  if (!isDebugMode()) return null
  const value = (await cookies()).get(debugViewerCookie)?.value
  if (value === "GUEST" || (value && isManagementRole(value))) return value
  return null
}
