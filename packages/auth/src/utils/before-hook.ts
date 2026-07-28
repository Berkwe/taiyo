import { cacheClient } from "@taiyomoe/cache"
import { db } from "@taiyomoe/db"
import { isAllowedEmailDomain, normalizeUsername } from "@taiyomoe/utils"
import { APIError, createAuthMiddleware } from "better-auth/api"
import { DateTime } from "luxon"

const throwInvalidCredsError = (isEmail: boolean) => {
  throw new APIError("FORBIDDEN", {
    code: isEmail
      ? "INVALID_EMAIL_OR_PASSWORD"
      : "INVALID_USERNAME_OR_PASSWORD",
    message: isEmail
      ? "Invalid email or password"
      : "Invalid username or password",
  })
}

export const beforeHook = createAuthMiddleware(async (ctx) => {
  const submittedEmail =
    typeof ctx.body?.email === "string"
      ? ctx.body.email
      : typeof ctx.body?.newEmail === "string"
        ? ctx.body.newEmail
        : null

  if (submittedEmail && !isAllowedEmailDomain(submittedEmail)) {
    throw new APIError("BAD_REQUEST", {
      code: "UNSUPPORTED_EMAIL_PROVIDER",
      message: "Use a supported permanent email provider",
    })
  }

  if (ctx.path === "/sign-up/email" && typeof ctx.body?.username === "string") {
    const username = normalizeUsername(ctx.body.username)
    const existingUser = await db.user.findFirst({
      where: { username },
      select: { id: true },
    })

    if (existingUser) {
      throw new APIError("UNPROCESSABLE_ENTITY", {
        code: "USERNAME_IS_ALREADY_TAKEN",
        message: "Username is already taken",
      })
    }
  }

  /**
   * Before signing in with email, we need to check 2 things:
   *
   * 1. If the user is trying to sign in with an address owned by Google OAuth
   * 2. If the user is trying to sign in to an account that is not verified and which has a pending verification email
   */
  if (ctx.path === "/sign-in/email") {
    const user = await db.user.findFirst({
      where: { email: ctx.body.email },
    })

    if (!user) {
      return
    }

    const accounts = await db.account.findMany({ where: { userId: user.id } })

    // Tried logging in with an email or username from a non-credential provider
    if (!accounts.some((a) => a.providerId === "credential")) {
      throwInvalidCredsError(true)
    }

    const account = accounts.find((a) => a.providerId === "credential")!
    const isCorrectPassword = await ctx.context.password.verify({
      password: ctx.body.password,
      hash: account.password!,
    })

    if (!isCorrectPassword) {
      throwInvalidCredsError(true)
    }

    if (user.emailVerified) {
      return
    }

    const cacheController = cacheClient.users.verificationEmailSentAt
    const verificationEmailSentAt = await cacheController.get(user.id)

    // Prevent sending emails too often
    if (verificationEmailSentAt) {
      const lastVerificationSentAt = DateTime.fromJSDate(
        verificationEmailSentAt,
      )
      const timeLimit = DateTime.now().minus({ hours: 1 })

      if (lastVerificationSentAt > timeLimit) {
        throw new APIError("FORBIDDEN", {
          code: "VERIFICATION_EMAIL_ALREADY_SENT",
          message: "Verification email already sent",
        })
      }
    }

    await cacheController.set(user.id, new Date())
  }
})
