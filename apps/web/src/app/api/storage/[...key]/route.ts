import { db } from "@taiyomoe/db"
import { getStorage } from "@taiyomoe/storage"
import { type NextRequest, NextResponse } from "next/server"
import { hasPermission } from "~/features/management/permissions"
import { getSession } from "~/utils/get-session"

const contentTypes: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
}
export const runtime = "nodejs"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const key = (await params).key.join("/")
  const [publicPage, publicCover, publicAvatar, reportAttachment] =
    await Promise.all([
      db.releasePage.findFirst({
        where: {
          storageKey: key,
          release: {
            isPublic: true,
            status: "PUBLISHED",
            deletedAt: null,
            chapter: { deletedAt: null, series: { deletedAt: null } },
          },
        },
        select: { id: true },
      }),
      db.series.findFirst({
        where: {
          OR: [{ coverStorageKey: key }, { bannerStorageKey: key }],
          deletedAt: null,
          isIndexable: true,
          publishedAt: { not: null },
        },
        select: { id: true },
      }),
      db.user.findFirst({
        where: { image: `/api/storage/${key}` },
        select: { id: true },
      }),
      db.contentReport.findFirst({
        where: { attachmentStorageKey: key },
        select: { userId: true },
      }),
    ])
  if (!publicPage && !publicCover && !publicAvatar) {
    const session = await getSession()
    const user = session?.user
      ? await db.user.findUnique({
          where: { id: session.user.id },
          select: { banned: true, role: true },
        })
      : null
    const canRead =
      user &&
      !user.banned &&
      (reportAttachment
        ? reportAttachment.userId === session?.user.id ||
          hasPermission(user.role, "users:manage")
        : hasPermission(user.role, "chapter:write"))
    if (!canRead) {
      return new NextResponse(null, { status: 404 })
    }
  }
  const object = await getStorage().read(key)
  if (!object) return new NextResponse(null, { status: 404 })
  const extension = key.split(".").pop()?.toLocaleLowerCase("en") ?? ""
  const body = new Uint8Array(object.body.byteLength)
  body.set(object.body)
  return new NextResponse(body.buffer, {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type":
        object.contentType ??
        contentTypes[extension] ??
        "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
