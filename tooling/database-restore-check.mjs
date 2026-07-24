import { spawnSync } from "node:child_process"
import { access, readFile } from "node:fs/promises"

const [dump, targetUrl] = process.argv.slice(2)
if (!dump || !targetUrl) {
  throw new Error(
    "Usage: database-restore-check.mjs <dump-file> <disposable-target-database-url>",
  )
}
await access(dump)
if (targetUrl === process.env.DATABASE_URL) {
  throw new Error(
    "Refusing to restore into the configured application database",
  )
}
let restore = spawnSync(
  "pg_restore",
  [
    "--clean",
    "--if-exists",
    "--no-owner",
    "--no-acl",
    "--dbname",
    targetUrl,
    dump,
  ],
  { stdio: "inherit" },
)
if (restore.error?.code === "ENOENT") {
  restore = spawnSync(
    "docker",
    [
      "compose",
      "exec",
      "-T",
      "postgres",
      "pg_restore",
      "--clean",
      "--if-exists",
      "--no-owner",
      "--no-acl",
      "--dbname",
      targetUrl,
    ],
    { input: await readFile(dump), stdio: ["pipe", "inherit", "inherit"] },
  )
}
if (restore.error) throw restore.error
if (restore.status !== 0) process.exit(restore.status ?? 1)
let verify = spawnSync(
  "psql",
  [
    targetUrl,
    "--tuples-only",
    "--command",
    'SELECT COUNT(*) FROM "_prisma_migrations";',
  ],
  { stdio: "inherit" },
)
if (verify.error?.code === "ENOENT") {
  verify = spawnSync(
    "docker",
    [
      "compose",
      "exec",
      "-T",
      "postgres",
      "psql",
      targetUrl,
      "--tuples-only",
      "--command",
      'SELECT COUNT(*) FROM "_prisma_migrations";',
    ],
    { stdio: "inherit" },
  )
}
if (verify.error) throw verify.error
process.exit(verify.status ?? 1)
