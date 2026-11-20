import { createEnv } from "@t3-oss/env-nextjs"
import { env as authEnv } from "@taiyomoe/auth/env"
import { z } from "zod"

export const env = createEnv({
  extends: [authEnv],

  /**
   * Specify your shared environment variables schema here.
   */
  shared: {
    NODE_ENV: z.enum(["development", "production"]).default("development"),
  },

  /**
   * Specify your server-side environment variables schema here.
   * This way you can ensure the app isn't built with invalid env vars.
   */
  server: {
    SOURCE_CATALOG_PROVIDER: z.enum(["mandown"]).default("mandown"),
    MANDOWN_PYTHON: z.string().min(1).optional(),
    MANDOWN_DOWNLOAD_ROOT: z.string().min(1).default("storage/mandown"),
    MANDOWN_JEV_CACHE: z.string().min(1).default("storage/mandown/jev.sqlite3"),
    MANDOWN_JEV_CACHE_REVISION: z.string().min(1).default("1"),
    MANDOWN_SEARCH_LOG: z
      .string()
      .min(1)
      .default("storage/mandown/search.jsonl"),
    JEVMODEL_API_KEY: z.string().optional(),
    TRANSLATION_BALANCED_CREDITS: z.coerce
      .number()
      .int()
      .positive()
      .default(100),
    TRANSLATION_PREMIUM_CREDITS: z.coerce
      .number()
      .int()
      .positive()
      .default(150),
    MAX_CHAPTERS_PER_REQUEST: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(10),
    CONTRIBUTOR_EARLY_ACCESS_HOURS: z.coerce
      .number()
      .int()
      .positive()
      .default(24),
  },

  /**
   * Specify your client-side environment variables schema here.
   * For them to be exposed to the client, prefix them with `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_POSTHOG_HOST: z.string(),
    NEXT_PUBLIC_POSTHOG_KEY: z.string(),
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string(),
  },

  /**
   * Destructure all variables from `process.env` to make sure they aren't tree-shaken away.
   */
  experimental__runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  },

  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
})
