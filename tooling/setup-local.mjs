import { spawnSync } from "node:child_process"
import { cpSync, existsSync, readFileSync, writeFileSync } from "node:fs"
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

const mandownPython = join(root, ".venv-mandown", "bin", "python")
const mandownRequirements = join(root, "tooling/requirements-mandown.txt")
const mandownStamp = join(root, ".venv-mandown", ".novora-requirements")
const expectedMandownRequirement = readFileSync(mandownRequirements, "utf8")

if (!existsSync(mandownPython)) {
  const python = process.env.PYTHON ?? "python3"
  const venv = spawnSync(python, ["-m", "venv", ".venv-mandown"], {
    cwd: root,
    stdio: "inherit",
  })
  if (venv.status !== 0) process.exit(venv.status ?? 1)
}

const installedMandownRequirement = existsSync(mandownStamp)
  ? readFileSync(mandownStamp, "utf8")
  : ""
if (installedMandownRequirement !== expectedMandownRequirement) {
  const install = spawnSync(
    mandownPython,
    [
      "-m",
      "pip",
      "install",
      "--disable-pip-version-check",
      "--force-reinstall",
      "-r",
      mandownRequirements,
    ],
    { cwd: root, stdio: "inherit" },
  )
  if (install.status !== 0) process.exit(install.status ?? 1)
  writeFileSync(mandownStamp, expectedMandownRequirement)
}

run("docker", [
  "compose",
  "up",
  "-d",
  "postgres",
  "meilisearch",
  "dragonfly",
  "mailpit",
])
run("corepack", ["pnpm", "--filter", "@taiyomoe/db", "db", "migrate", "deploy"])
run("corepack", ["pnpm", "--filter", "@taiyomoe/db", "seed"])
console.log(
  "NovoraScans local services, migrations, and fictional seed are ready. Mail inbox: http://localhost:8025",
)
