import { spawnSync } from "node:child_process"
import { cpSync, existsSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()
const envFile = join(root, ".env")
if (!existsSync(envFile)) {
  cpSync(join(root, ".env.example"), envFile)
  console.log("Created .env from .env.example")
}

function run(command, args) {
  const result = spawnSync(
    process.execPath,
    [join(root, "tooling/with-root-env.mjs"), command, ...args],
    { cwd: root, stdio: "inherit" },
  )
  if (result.status !== 0) process.exit(result.status ?? 1)
}

run("docker", ["compose", "up", "-d", "postgres", "meilisearch", "dragonfly"])
run("corepack", ["pnpm", "--filter", "@taiyomoe/db", "db", "migrate", "deploy"])
run("corepack", ["pnpm", "--filter", "@taiyomoe/db", "seed"])
console.log(
  "NovoraScans local services, migrations, and fictional seed are ready.",
)
