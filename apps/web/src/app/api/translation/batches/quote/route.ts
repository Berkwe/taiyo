import { db } from "@taiyomoe/db"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { currentActiveUser } from "~/features/reading/server"
import { evaluateBatchEligibility } from "~/features/translation/batch-instant"
import { getSourceCatalogProvider } from "~/features/translation/provider"
import { rejectCrossOriginWrite } from "~/utils/api-security"

const schema = z
  .object({
    catalogSeriesId: z.string().min(1).max(120),
    sourceEditionId: z.string().min(1).max(120),
    chapterIds: z.array(z.string().min(1).max(160)).min(2).max(10),
    qualityTier: z.enum(["balanced", "premium"]),
  })
  .refine((value) => new Set(value.chapterIds).size >= 2)

export async function POST(request: NextRequest) {
  const rejected = rejectCrossOriginWrite(request)
  if (rejected) return rejected
  const parsed = schema.safeParse(await request.json())
  if (!parsed.success)
    return NextResponse.json(
      { error: "Geçersiz çoklu anında çeviri seçimi." },
      { status: 400 },
    )

  const series = await getSourceCatalogProvider().getSeriesDetails(
    parsed.data.catalogSeriesId,
  )
  const edition = series?.editions.find(
    (item) => item.id === parsed.data.sourceEditionId,
  )
  if (!series || !edition)
    return NextResponse.json({ error: "Kaynak bulunamadı." }, { status: 404 })

  const [quote, user] = await Promise.all([
    db.$transaction((tx) =>
      evaluateBatchEligibility({
        tx,
        series,
        edition,
        requestedChapterIds: parsed.data.chapterIds,
        qualityTier: parsed.data.qualityTier,
      }),
    ),
    currentActiveUser(),
  ])
  const account =
    user && !user.banned
      ? await db.creditAccount.findUnique({
          where: { userId: user.id },
          select: { cachedBalance: true },
        })
      : null
  const balance = account?.cachedBalance ?? 0
  return NextResponse.json({
    quote: {
      ...quote,
      balance,
      missingCredits: Math.max(0, quote.totalCredits - balance),
    },
  })
}
