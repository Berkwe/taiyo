import { db } from "@taiyomoe/db"
import { forbidden, unauthorized } from "next/navigation"
import { debugAccounts } from "~/features/debug/config"
import { getDebugViewerRole } from "~/features/debug/viewer"
import { getSession } from "~/utils/get-session"
import { hasPermission, type ManagementPermission } from "./permissions"

export async function requireManagementUser(permission?: ManagementPermission) {
  const debugRole = await getDebugViewerRole()
  if (debugRole && debugRole !== "GUEST") {
    if (permission && !hasPermission(debugRole, permission)) forbidden()
    const mock = debugAccounts[debugRole]
    const seedUser = await db.user.upsert({
      where: { id: mock.id },
      create: {
        id: mock.id,
        name: mock.name,
        username: `debug_${debugRole.toLowerCase()}`,
        displayUsername: `debug_${debugRole.toLowerCase()}`,
        emailVerified: true,
        role: debugRole,
        banned: false,
      },
      update: { name: mock.name, role: debugRole, banned: false },
      select: { id: true, role: true, banned: true },
    })
    return { ...seedUser, role: debugRole }
  }
  const session = await getSession()
  if (!session?.user) unauthorized()

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, banned: true },
  })
  if (!user || user.banned) unauthorized()
  if (permission && !hasPermission(user.role, permission)) forbidden()
  return user
}
