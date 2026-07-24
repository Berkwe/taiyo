import { statfs } from "node:fs/promises"
import path from "node:path"
import { db } from "@taiyomoe/db"
import { getStorage } from "@taiyomoe/storage"
import { NextResponse } from "next/server"
import { requireManagementUser } from "~/features/management/server"

export const runtime = "nodejs"

export async function GET() {
  await requireManagementUser("users:manage")
  const startedAt = performance.now()
  const storageRoot = path.resolve(
    process.env.INIT_CWD ?? process.cwd(),
    process.env.LOCAL_STORAGE_PATH ?? "storage",
  )
  const [database, disk] = await Promise.allSettled([
    db.$queryRaw`SELECT 1`,
    statfs(storageRoot),
  ])
  const diskValue = disk.status === "fulfilled" ? disk.value : null
  const totalBytes = diskValue
    ? Number(diskValue.blocks) * Number(diskValue.bsize)
    : null
  const availableBytes = diskValue
    ? Number(diskValue.bavail) * Number(diskValue.bsize)
    : null
  const usedRatio =
    totalBytes && availableBytes !== null
      ? (totalBytes - availableBytes) / totalBytes
      : null
  return NextResponse.json({
    status: database.status === "fulfilled" ? "ok" : "degraded",
    database: database.status,
    storageDriver: getStorage().driver,
    disk: {
      totalBytes,
      availableBytes,
      usedRatio,
      level:
        usedRatio === null
          ? "unknown"
          : usedRatio >= 0.95
            ? "critical"
            : usedRatio >= 0.85
              ? "warning"
              : "ok",
    },
    durationMs: Math.round(performance.now() - startedAt),
  })
}
