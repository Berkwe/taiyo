import { db } from "@taiyomoe/db"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { rejectCrossOriginWrite } from "~/utils/api-security"
import { getSession } from "~/utils/get-session"

const schema = z.object({ enabled: z.boolean() })

export async function PUT(request: NextRequest) {
  const rejected = rejectCrossOriginWrite(request)
  if (rejected) return rejected

  const session = await getSession()
  if (!session?.user)
    return NextResponse.json({ error: "Giriş yapmalısınız." }, { status: 401 })

  const parsed = schema.safeParse(await request.json())
  if (!parsed.success)
    return NextResponse.json(
      { error: "Yetişkin içerik ayarı geçersiz." },
      { status: 400 },
    )

  const current =
    session.user.settings &&
    typeof session.user.settings === "object" &&
    !Array.isArray(session.user.settings)
      ? session.user.settings
      : {}

  await db.user.update({
    where: { id: session.user.id },
    data: {
      settings: {
        ...current,
        showAdultAniListResults: parsed.data.enabled,
      },
    },
  })

  return NextResponse.json({ enabled: parsed.data.enabled })
}
