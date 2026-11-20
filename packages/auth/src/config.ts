import { cacheClient } from "@taiyomoe/cache"
import { db } from "@taiyomoe/db"
import type { Roles } from "@taiyomoe/db/browser"
import {
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_REGEX,
} from "@taiyomoe/utils"
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import {
  admin,
  captcha,
  customSession,
  multiSession,
} from "better-auth/plugins"
import { z } from "zod"
import { env } from "./env"
import { afterHook } from "./utils/after-hook"
import { afterSessionCreatedHook } from "./utils/after-session-created-hook"
import { beforeHook } from "./utils/before-hook"
import { beforeUserCreatedHook } from "./utils/before-user-created-hook"
import { logAuthApiError } from "./utils/log-auth-api-error"
import { sendResetPassword } from "./utils/send-reset-password"
import { sendVerificationEmail } from "./utils/send-verification-email"
import { getTrustedOrigins } from "./utils/trusted-origins"

const turnstileSecretKey =
  process.env.NODE_ENV !== "production" &&
  env.TURNSTILE_SECRET_KEY === "disabled"
    ? "1x0000000000000000000000000000000AA"
    : env.TURNSTILE_SECRET_KEY

export const auth = betterAuth({
  appName: "NovoraScans",
  trustedOrigins: (request) =>
    getTrustedOrigins(
      request,
      [env.BETTER_AUTH_URL, ...env.BETTER_AUTH_TRUSTED_ORIGINS],
      process.env.NODE_ENV !== "production",
    ),
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 50,
    requireEmailVerification: true,
    sendResetPassword,
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail,
  },
  account: { accountLinking: { enabled: false } },
  onAPIError: { onError: logAuthApiError },
  user: {
    changeEmail: { enabled: true },
    additionalFields: {
      username: {
        type: "string",
        required: false,
        input: true,
        validator: {
          input: z
            .string()
            .min(USERNAME_MIN_LENGTH)
            .max(USERNAME_MAX_LENGTH)
            .regex(USERNAME_REGEX),
        },
      },
      displayUsername: {
        type: "string",
        required: false,
        input: false,
      },
      normalizedEmail: {
        type: "string",
        required: false,
        input: false,
        returned: false,
      },
      settings: { fieldName: "settings", type: "string" },
    },
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  secondaryStorage: {
    set: cacheClient.users.auth.set,
    get: cacheClient.users.auth.get,
    delete: cacheClient.users.auth.invalidate,
  },
  rateLimit: {
    enabled: true,
    storage: "secondary-storage",
    customRules: {
      "/sign-in/email": { window: 60, max: 3 },
      "/sign-up": { window: 120, max: 1 },
      "/forget-password": { window: 120, max: 1 },
    },
  },
  session: { storeSessionInDatabase: true },
  advanced: { database: { generateId: "uuid" } },
  hooks: { before: beforeHook, after: afterHook },
  databaseHooks: {
    user: {
      create: {
        before: beforeUserCreatedHook,
      },
    },
    session: { create: { after: afterSessionCreatedHook } },
  },
  plugins: [
    multiSession({ maximumSessions: 5 }),
    captcha({
      provider: "cloudflare-turnstile",
      secretKey: turnstileSecretKey,
      endpoints: ["/sign-up", "/forget-password"],
    }),
    admin({ defaultRole: "USER" }),
    customSession(async ({ session, user }) => ({
      session,
      user: {
        ...user,
        ...(user as unknown as {
          username: string | null | undefined
          displayUsername: string | null | undefined
          banned: boolean | null | undefined
          banReason: string | null | undefined
          banExpires: Date | null | undefined
          role: Roles
          settings: PrismaJson.UserSettings
        }),
      },
    })),
  ],
})

export type User = Omit<typeof auth.$Infer.Session.user, "settings"> & {
  role: Roles
  settings: PrismaJson.UserSettings
}

export type Session = Omit<typeof auth.$Infer.Session, "user"> & {
  user: User
}
