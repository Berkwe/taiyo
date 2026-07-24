import { db } from "@taiyomoe/db"
import { getStorage } from "@taiyomoe/storage"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function GET() {
  const checks = await Promise.allSettled([
    db.$queryRaw`SELECT 1`,
    Promise.resolve(getStorage().driver),
  ])
  const healthy = checks.every((check) => check.status === "fulfilled")
  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      checks: { database: checks[0]?.status, storage: checks[1]?.status },
      timestamp: new Date().toISOString(),
    },
    {
      status: healthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  )
}
