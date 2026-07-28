import { db } from "@taiyomoe/db"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { quoteTranslation } from "~/features/translation/pricing"
import { getSourceCatalogProvider } from "~/features/translation/provider"
import { rejectCrossOriginWrite } from "~/utils/api-security"

const schema = z.object({
  sourceEditionId: z.string().min(1).max(120),
  chapterIds: z.array(z.string().min(1).max(160)).min(1).max(2_000),
  qualityTier: z.enum(["balanced", "premium"]),
})

export async function POST(request: NextRequest) {
  const rejected = rejectCrossOriginWrite(request)
  if (rejected) return rejected
  const parsed = schema.safeParse(await request.json())
  if (!parsed.success)
    return NextResponse.json({ error: "Geçersiz seçim." }, { status: 400 })
  const chapters = await getSourceCatalogProvider().listSourceChapters(
    parsed.data.sourceEditionId,
  )
  const selected = parsed.data.chapterIds.map((id) =>
    chapters.find((chapter) => chapter.id === id),
  )
  if (selected.some((chapter) => !chapter))
    return NextResponse.json(
      { error: "Bölüm kaynağa ait değil." },
      { status: 400 },
    )
  try {
    const quote = quoteTranslation({
      chapters: selected.map((chapter) => ({
        id: chapter!.id,
        number: chapter!.number,
      })),
      qualityTier: parsed.data.qualityTier,
    })
    const sourceEdition = await db.catalogSourceEdition.findUnique({
      where: { id: parsed.data.sourceEditionId },
      select: { catalogSeriesId: true },
    })
    const selectedNumbers = selected.map((chapter) => chapter!.number)
    const relatedChapters = sourceEdition
      ? await db.catalogSourceChapter.findMany({
          where: {
            chapterNumber: { in: selectedNumbers },
            sourceEdition: {
              catalogSeriesId: sourceEdition.catalogSeriesId,
              isActive: true,
            },
          },
          select: { id: true, chapterNumber: true },
        })
      : []
    const relatedIds = relatedChapters.map((chapter) => chapter.id)
    const [completed, activeRequests] = await Promise.all([
      db.translationCampaign.findMany({
        where: {
          sourceEditionId: parsed.data.sourceEditionId,
          status: "COMPLETED",
          outputLanguage: "tr",
          chapters: {
            some: { sourceChapterId: { in: parsed.data.chapterIds } },
          },
        },
        select: {
          qualityTier: true,
          chapters: {
            where: { sourceChapterId: { in: parsed.data.chapterIds } },
            select: { sourceChapterId: true },
          },
        },
      }),
      sourceEdition
        ? db.translationCampaign.findMany({
            where: {
              catalogSeriesId: sourceEdition.catalogSeriesId,
              outputLanguage: "tr",
              status: {
                in: ["FUNDING", "FUNDED", "QUEUED", "PROCESSING"],
              },
              chapters: {
                some: {
                  sourceChapterId: { in: relatedIds },
                  status: "PENDING",
                },
              },
            },
            select: {
              id: true,
              kind: true,
              targetCredits: true,
              fundedCredits: true,
              outputLanguage: true,
              qualityTier: true,
              sourceEditionId: true,
              chapters: {
                where: {
                  sourceChapterId: { in: relatedIds },
                  status: "PENDING",
                },
                select: { sourceChapterId: true },
              },
            },
          })
        : Promise.resolve([]),
    ])
    const editionLabels = activeRequests.length
      ? await db.catalogSourceEdition.findMany({
          where: {
            id: {
              in: activeRequests.map((campaign) => campaign.sourceEditionId),
            },
          },
          select: { id: true, publicSourceLabel: true },
        })
      : []
    const labelByEdition = new Map(
      editionLabels.map((edition) => [edition.id, edition.publicSourceLabel]),
    )
    const numberByRelatedId = new Map(
      relatedChapters.map((chapter) => [chapter.id, chapter.chapterNumber]),
    )
    const qualityByChapter = new Map<string, "balanced" | "premium">()
    for (const campaign of completed) {
      const tier = campaign.qualityTier === "PREMIUM" ? "premium" : "balanced"
      for (const chapter of campaign.chapters) {
        if (
          tier === "premium" ||
          !qualityByChapter.has(chapter.sourceChapterId)
        )
          qualityByChapter.set(chapter.sourceChapterId, tier)
      }
    }
    const requestedQuality =
      parsed.data.qualityTier === "premium" ? "PREMIUM" : "BALANCED"
    return NextResponse.json({
      // Existing package progress belongs to conflictingRequests. The quote
      // always prices only the user's current selection, including when they
      // choose to translate one package chapter independently.
      quote,
      existingTranslations: selected.flatMap((chapter) => {
        const qualityTier = qualityByChapter.get(chapter!.id)
        return qualityTier
          ? [
              {
                chapterId: chapter!.id,
                chapterNumber: chapter!.number,
                qualityTier,
              },
            ]
          : []
      }),
      conflictingRequests: activeRequests.flatMap((campaign) => {
        const matchedChapters = campaign.chapters.flatMap((chapter) => {
          const chapterNumber = numberByRelatedId.get(chapter.sourceChapterId)
          return chapterNumber
            ? [
                {
                  id: chapter.sourceChapterId,
                  number: chapterNumber,
                },
              ]
            : []
        })
        if (!matchedChapters.length) return []
        const qualityTier =
          campaign.qualityTier === "PREMIUM" ? "premium" : "balanced"
        const sameSource =
          campaign.sourceEditionId === parsed.data.sourceEditionId
        return [
          {
            campaignId: campaign.id,
            campaignKind: campaign.kind === "INSTANT" ? "instant" : "community",
            chapterIds: matchedChapters.map((chapter) => chapter.id),
            chapterNumbers: matchedChapters.map((chapter) => chapter.number),
            qualityTier,
            outputLanguage: "tr",
            sourceEditionId: campaign.sourceEditionId,
            sourceLabel:
              labelByEdition.get(campaign.sourceEditionId) ??
              "Bilinmeyen kaynak",
            sameSource,
            sameSettings:
              sameSource &&
              campaign.qualityTier === requestedQuality &&
              campaign.outputLanguage === "tr",
            targetCredits: campaign.targetCredits,
            fundedCredits: campaign.fundedCredits,
            remainingCredits: Math.max(
              0,
              campaign.targetCredits - campaign.fundedCredits,
            ),
          },
        ]
      }),
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Fiyat hesaplanamadı.",
      },
      { status: 400 },
    )
  }
}
