import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { loadEnvFile } from "node:process"

function findWorkspaceRoot(start) {
  let current = resolve(start)
  while (dirname(current) !== current) {
    if (existsSync(join(current, "pnpm-workspace.yaml"))) return current
    current = dirname(current)
  }
  throw new Error("Could not locate pnpm-workspace.yaml")
}

const root = findWorkspaceRoot(process.cwd())
const envFile = join(root, ".env")
if (existsSync(envFile)) loadEnvFile(envFile)

// Local-only fallbacks keep fixture-backed development independent from
// optional third-party accounts. Production must provide real values.
if (process.env.NODE_ENV !== "production") {
  const localDefaults = {
    BETTER_AUTH_SECRET: "local-development-only-change-before-production",
    DISCORD_CLIENT_ID: "disabled",
    DISCORD_CLIENT_SECRET: "disabled",
    GOOGLE_CLIENT_ID: "disabled",
    GOOGLE_CLIENT_SECRET: "disabled",
    HYPERDX_PORT: "8080",
    MEILISEARCH_ADMIN_KEY: "local-development-master-key",
    MEILISEARCH_MASTER_KEY: "local-development-master-key",
    NEXT_PUBLIC_MEILISEARCH_PUBLIC_KEY: "local-development-master-key",
    NEXT_PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com",
    NEXT_PUBLIC_POSTHOG_KEY: "disabled",
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: "disabled",
    RESEND_API_KEY: "re_local_development_only",
    TURNSTILE_SECRET_KEY: "disabled",
  }
  for (const [key, value] of Object.entries(localDefaults)) {
    if (!process.env[key]) process.env[key] = value
  }
}

const [command, ...args] = process.argv.slice(2)
if (!command) throw new Error("Usage: with-root-env <command> [...args]")

const result = spawnSync(command, args, {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
})

if (result.error) throw result.error
process.exit(result.status ?? 1)
