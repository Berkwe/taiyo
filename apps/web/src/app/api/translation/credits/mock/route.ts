import { db } from "@taiyomoe/db"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { currentActiveUser } from "~/features/reading/server"
import { rejectCrossOriginWrite } from "~/utils/api-security"

const schema = z.object({
  credits: z.number().int().positive().max(10_000),
  idempotencyKey: z.string().min(8).max(120),
})

export async function POST(request: NextRequest) {
  const rejected = rejectCrossOriginWrite(request)
  if (rejected) return rejected
  const user = await currentActiveUser()
  if (!user || user.banned)
    return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 })
  if (process.env.NODE_ENV === "production" && user.role !== "ADMIN")
    return NextResponse.json({ error: "Yetkisiz işlem." }, { status: 403 })
  const parsed = schema.safeParse(await request.json())
  if (!parsed.success)
    return NextResponse.json(
      { error: "Geçersiz kredi isteği." },
      { status: 400 },
    )
  await db.$transaction(async (tx) => {
    const existing = await tx.creditTransaction.findUnique({
      where: { idempotencyKey: parsed.data.idempotencyKey },
    })
    if (existing) return
    await tx.creditAccount.upsert({
      where: { userId: user.id },
      create: { userId: user.id, cachedBalance: parsed.data.credits },
      update: { cachedBalance: { increment: parsed.data.credits } },
    })
    await tx.creditTransaction.create({
      data: {
        userId: user.id,
        amount: parsed.data.credits,
        type: "ADMIN_ADJUSTMENT",
        referenceType: "mock_credit",
        idempotencyKey: parsed.data.idempotencyKey,
        metadata: { development: process.env.NODE_ENV !== "production" },
      },
    })
  })
  return NextResponse.json({ success: true })
}
