import { randomUUID } from "node:crypto"
import { db } from "@taiyomoe/db"
import { getStorage } from "@taiyomoe/storage"
import { parseImage } from "@taiyomoe/storage/cbz"
import { type NextRequest, NextResponse } from "next/server"
import { rejectCrossOriginWrite } from "~/utils/api-security"
import { getSession } from "~/utils/get-session"

export const runtime = "nodejs"
const maximumBytes = 5 * 1024 * 1024
const maximumPixels = 25_000_000

function previousAvatarKey(image: string | null | undefined) {
  const prefix = "/api/storage/"
  if (!image?.startsWith(`${prefix}avatars/`)) return null
  return image.slice(prefix.length)
}

export async function POST(request: NextRequest) {
  const rejected = rejectCrossOriginWrite(request)
  if (rejected) return rejected
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Giriş yapmalısınız." }, { status: 401 })
  }
  const formData = await request.formData()
  const file = formData.get("avatar")
  if (!(file instanceof File) || file.size === 0 || file.size > maximumBytes) {
    return NextResponse.json(
      { error: "Profil görseli 5 MB veya daha küçük olmalıdır." },
      { status: 400 },
    )
  }
  let image: ReturnType<typeof parseImage>
  try {
    image = parseImage(new Uint8Array(await file.arrayBuffer()))
  } catch {
    return NextResponse.json(
      { error: "Dosya geçerli bir JPEG, PNG veya WebP görseli değil." },
      { status: 400 },
    )
  }
  if (
    image.width < 64 ||
    image.height < 64 ||
    image.width > 8_000 ||
    image.height > 8_000 ||
    image.width * image.height > maximumPixels
  ) {
    return NextResponse.json(
      { error: "Görsel boyutları 64×64 ile 25 megapiksel arasında olmalıdır." },
      { status: 400 },
    )
  }
  const key = `avatars/${session.user.id}/${randomUUID()}.${image.extension}`
  const storage = getStorage()
  await storage.put(key, image.body, { contentType: image.mimeType })
  const url = storage.url(key)
  const existing = await db.user.findUnique({
    where: { id: session.user.id },
    select: { image: true },
  })
  try {
    await db.user.update({
      where: { id: session.user.id },
      data: { image: url },
    })
  } catch (error) {
    await storage.delete(key)
    throw error
  }
  const oldKey = previousAvatarKey(existing?.image)
  if (oldKey) await storage.delete(oldKey)
  return NextResponse.json({ image: url })
}
