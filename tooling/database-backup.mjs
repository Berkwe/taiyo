import { spawnSync } from "node:child_process"
import { mkdir, readdir, stat, unlink, writeFile } from "node:fs/promises"
import path from "node:path"

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error("DATABASE_URL is required")
const directory = path.resolve(
  process.env.BACKUP_DIRECTORY ?? "backups/database",
)
const retentionDays = Number.parseInt(
  process.env.BACKUP_RETENTION_DAYS ?? "14",
  10,
)
if (!Number.isInteger(retentionDays) || retentionDays < 1) {
  throw new Error("BACKUP_RETENTION_DAYS must be a positive integer")
}
await mkdir(directory, { recursive: true, mode: 0o700 })
const timestamp = new Date().toISOString().replaceAll(":", "-")
const target = path.join(directory, `novora-${timestamp}.dump`)
let result = spawnSync(
  "pg_dump",
  ["--format=custom", "--no-owner", "--no-acl", "--file", target, databaseUrl],
  { stdio: "inherit" },
)
if (result.error?.code === "ENOENT") {
  result = spawnSync(
    "docker",
    [
      "compose",
      "exec",
      "-T",
      "postgres",
      "pg_dump",
      "--format=custom",
      "--no-owner",
      "--no-acl",
      "--username",
      process.env.DATABASE_USERNAME ?? "postgres",
      process.env.DATABASE_NAME ?? "taiyo",
    ],
    { maxBuffer: 1024 * 1024 * 1024 },
  )
  if (result.status === 0 && result.stdout) {
    await writeFile(target, result.stdout, { mode: 0o600 })
  }
}
if (result.error) throw result.error
if (result.status !== 0) {
  if (result.stderr) process.stderr.write(result.stderr)
  process.exit(result.status ?? 1)
}

const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1_000
for (const name of await readdir(directory)) {
  if (!name.startsWith("novora-") || !name.endsWith(".dump")) continue
  const file = path.join(directory, name)
  if ((await stat(file)).mtimeMs < cutoff) await unlink(file)
}
process.stdout.write(`${target}\n`)
