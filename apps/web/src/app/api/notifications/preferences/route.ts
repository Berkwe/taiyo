import { db } from "@taiyomoe/db"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { currentActiveUser } from "~/features/reading/server"
import { rejectCrossOriginWrite } from "~/utils/api-security"

const schema = z.object({
  followedSeriesUpdates: z.boolean(),
  reportStatusUpdates: z.boolean(),
  accountUpdates: z.boolean(),
})

export async function GET() {
  const user = await currentActiveUser()
  if (!user || user.banned) {
    return NextResponse.json({ authenticated: false })
  }
  const preferences = await db.notificationPreference.findUnique({
    where: { userId: user.id },
  })
  return NextResponse.json({
    authenticated: true,
    preferences: preferences ?? {
      followedSeriesUpdates: true,
      reportStatusUpdates: true,
      accountUpdates: true,
    },
  })
}

export async function PUT(request: NextRequest) {
  const rejected = rejectCrossOriginWrite(request)
  if (rejected) return rejected
  const user = await currentActiveUser()
  if (!user || user.banned) {
    return NextResponse.json({ error: "Giriş yapmalısınız." }, { status: 401 })
  }
  const parsed = schema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz tercihler." }, { status: 400 })
  }
  const preferences = await db.notificationPreference.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...parsed.data },
    update: parsed.data,
  })
  return NextResponse.json({ preferences })
}
