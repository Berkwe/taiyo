import { db } from "@taiyomoe/db"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { currentActiveUser } from "~/features/reading/server"
import { rejectCrossOriginWrite } from "~/utils/api-security"

export async function GET(request: NextRequest) {
  const user = await currentActiveUser()
  if (!user || user.banned) {
    return NextResponse.json({
      authenticated: false,
      entries: [],
      unreadCount: 0,
      nextCursor: null,
    })
  }
  const cursor = request.nextUrl.searchParams.get("cursor")
  const entries = await db.siteNotification.findMany({
    where: { userId: user.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 21,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      type: true,
      title: true,
      message: true,
      href: true,
      readAt: true,
      createdAt: true,
    },
  })
  const unreadCount = await db.siteNotification.count({
    where: { userId: user.id, readAt: null },
  })
  const hasMore = entries.length > 20
  const page = hasMore ? entries.slice(0, 20) : entries
  return NextResponse.json({
    authenticated: true,
    entries: page,
    unreadCount,
    nextCursor: hasMore ? page.at(-1)?.id : null,
  })
}

const patchSchema = z.union([
  z.object({ all: z.literal(true) }),
  z.object({ id: z.uuid() }),
])

export async function PATCH(request: NextRequest) {
  const rejected = rejectCrossOriginWrite(request)
  if (rejected) return rejected
  const user = await currentActiveUser()
  if (!user || user.banned) {
    return NextResponse.json({ error: "Giriş yapmalısınız." }, { status: 401 })
  }
  const parsed = patchSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz bildirim." }, { status: 400 })
  }
  await db.siteNotification.updateMany({
    where:
      "all" in parsed.data
        ? { userId: user.id, readAt: null }
        : { id: parsed.data.id, userId: user.id },
    data: { readAt: new Date() },
  })
  return new NextResponse(null, { status: 204 })
}
