import { db } from "@taiyomoe/db"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { currentActiveUser } from "~/features/reading/server"
import { rejectCrossOriginWrite } from "~/utils/api-security"

const canonicalKeySchema = z.string().trim().min(1).max(160)
const writeSchema = z.object({
  canonicalKey: canonicalKeySchema,
  sourceEditionId: z.string().trim().min(1).max(120),
})

export async function GET(request: NextRequest) {
  const user = await currentActiveUser()
  const canonicalKey = canonicalKeySchema.safeParse(
    request.nextUrl.searchParams.get("canonicalKey"),
  )
  if (!user || user.banned || !canonicalKey.success)
    return NextResponse.json({ sourceEditionId: null })
  const preference = await db.translationSourcePreference.findUnique({
    where: {
      userId_canonicalKey: {
        userId: user.id,
        canonicalKey: canonicalKey.data,
      },
    },
    include: { sourceEdition: { select: { externalEditionId: true } } },
  })
  return NextResponse.json({
    sourceEditionId: preference?.sourceEdition.externalEditionId ?? null,
  })
}

export async function PUT(request: NextRequest) {
  const rejected = rejectCrossOriginWrite(request)
  if (rejected) return rejected
  const user = await currentActiveUser()
  if (!user || user.banned)
    return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 })
  const parsed = writeSchema.safeParse(await request.json())
  if (!parsed.success)
    return NextResponse.json({ error: "Geçersiz tercih." }, { status: 400 })
  const source = await db.catalogSourceEdition.findFirst({
    where: {
      id: parsed.data.sourceEditionId,
      catalogSeries: {
        providerKey: { startsWith: "mandown:" },
        canonicalKey: parsed.data.canonicalKey,
        isActive: true,
      },
      isActive: true,
    },
    select: { id: true },
  })
  if (!source)
    return NextResponse.json({ error: "Kaynak bulunamadı." }, { status: 404 })
  await db.translationSourcePreference.upsert({
    where: {
      userId_canonicalKey: {
        userId: user.id,
        canonicalKey: parsed.data.canonicalKey,
      },
    },
    create: {
      userId: user.id,
      canonicalKey: parsed.data.canonicalKey,
      sourceEditionId: source.id,
    },
    update: { sourceEditionId: source.id },
  })
  return NextResponse.json({ sourceEditionId: parsed.data.sourceEditionId })
}
