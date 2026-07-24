import { cookies } from "next/headers"
import {
  type DebugViewerRole,
  debugViewerCookie,
} from "~/features/debug/config"
import { isManagementRole } from "~/features/management/permissions"

export function isDebugMode() {
  return process.env.NODE_ENV !== "production"
}

export async function getDebugViewerRole(): Promise<DebugViewerRole | null> {
  if (!isDebugMode()) return null
  const value = (await cookies()).get(debugViewerCookie)?.value
  if (value === "GUEST" || (value && isManagementRole(value))) return value
  return null
}
