import { createAuthMiddleware } from "better-auth/api"
import { provisionUserAfterCommit } from "./after-user-created-hook"
import { getSessionFromHeaders } from "./get-session-from-headers"

export const afterHook = createAuthMiddleware(async (ctx) => {
  if (
    ctx.path === "/sign-up/email" ||
    ctx.path.startsWith("/callback/") ||
    ctx.path.startsWith("/oauth2/callback/")
  ) {
    const returned = ctx.context.returned as
      | { user?: { id?: string } }
      | undefined
    const userId = returned?.user?.id ?? ctx.context.newSession?.user.id

    if (userId) {
      await provisionUserAfterCommit(userId)
    }
  }

  if (ctx.path === "/sign-out") {
    const session = await getSessionFromHeaders(ctx)

    if (!session) return

    // await logsClient.users.auth.insert({
    //   type: "signedOut",
    //   ip: session.session.ipAddress,
    //   userId: session.user.id,
    // })
  }
})
