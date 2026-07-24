import { db } from "@taiyomoe/db"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { rejectCrossOriginWrite } from "~/utils/api-security"
import { getSession } from "~/utils/get-session"

const profileSettingsSchema = z.object({
  name: z.string().trim().min(2).max(50),
  about: z.string().trim().max(500),
  city: z.string().trim().max(80),
})

export async function PUT(request: NextRequest) {
  const rejected = rejectCrossOriginWrite(request)
  if (rejected) return rejected
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Giriş yapmalısınız." }, { status: 401 })
  }
  const parsed = profileSettingsSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Profil bilgilerini kontrol edin." },
      { status: 400 },
    )
  }
  const { about, city, name } = parsed.data
  await db.$transaction([
    db.user.update({ where: { id: session.user.id }, data: { name } }),
    db.userProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        about: about || null,
        city: city || null,
      },
      update: { about: about || null, city: city || null },
    }),
  ])
  return NextResponse.json({ ok: true })
}
