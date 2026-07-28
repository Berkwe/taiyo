import type {
  BatchTranslationItemStatus,
  BatchTranslationStatus,
  Prisma,
} from "@taiyomoe/db"
import { translationConfig } from "./pricing"
import type {
  PublicCatalogSeries,
  PublicSourceEdition,
  TranslationQuality,
} from "./types"

export interface BatchEligibilityItem {
  sourceChapterId: string
  chapterNumber: string
  eligible: boolean
  exclusionReason?: string
}

export interface BatchEligibility {
  requestedCount: number
  eligibleCount: number
  excludedCount: number
  perChapterCredits: number
  totalCredits: number
  items: BatchEligibilityItem[]
}

export function batchStatusFromItems(
  statuses: BatchTranslationItemStatus[],
): BatchTranslationStatus {
  const active = statuses.some(
    (status) => status === "QUEUED" || status === "PROCESSING",
  )
  if (active)
    return statuses.some((status) => status === "PROCESSING")
      ? "PROCESSING"
      : "QUEUED"
  const completed = statuses.filter((status) => status === "COMPLETED").length
  const failed = statuses.filter((status) => status === "FAILED").length
  if (failed && completed) return "PARTIAL_FAILED"
  if (failed) return "FAILED"
  return "COMPLETED"
}

export async function evaluateBatchEligibility(input: {
  tx: Prisma.TransactionClient
  series: PublicCatalogSeries
  edition: PublicSourceEdition
  requestedChapterIds: string[]
  qualityTier: TranslationQuality
}): Promise<BatchEligibility> {
  const uniqueIds = [...new Set(input.requestedChapterIds)]
  const chapterById = new Map(
    input.edition.chapters.map((chapter) => [chapter.id, chapter]),
  )
  const validChapters = uniqueIds.flatMap((id) => {
    const chapter = chapterById.get(id)
    return chapter ? [chapter] : []
  })
  const selectedNumbers = validChapters.map((chapter) => chapter.number)
  const relatedChapters = selectedNumbers.length
    ? await input.tx.catalogSourceChapter.findMany({
        where: {
          chapterNumber: { in: selectedNumbers },
          sourceEdition: {
            catalogSeriesId: input.series.id,
            isActive: true,
          },
        },
        select: { id: true, chapterNumber: true },
      })
    : []
  const relatedIds = relatedChapters.map((chapter) => chapter.id)
  const numberByRelatedId = new Map(
    relatedChapters.map((chapter) => [chapter.id, chapter.chapterNumber]),
  )

  const [completedCampaigns, activeJobCampaigns, publishedChapters] =
    await Promise.all([
      relatedIds.length
        ? input.tx.translationCampaign.findMany({
            where: {
              outputLanguage: "tr",
              status: "COMPLETED",
              chapters: {
                some: { sourceChapterId: { in: relatedIds } },
              },
            },
            select: {
              chapters: {
                where: { sourceChapterId: { in: relatedIds } },
                select: { sourceChapterId: true },
              },
            },
          })
        : Promise.resolve([]),
      relatedIds.length
        ? input.tx.translationCampaign.findMany({
            where: {
              outputLanguage: "tr",
              status: { in: ["FUNDED", "QUEUED", "PROCESSING"] },
              job: {
                status: { in: ["QUEUED", "PROCESSING"] },
              },
              chapters: {
                some: {
                  sourceChapterId: { in: relatedIds },
                  status: "PENDING",
                },
              },
            },
            select: {
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
      input.series.canonicalSeriesId && selectedNumbers.length
        ? input.tx.platformChapter.findMany({
            where: {
              seriesId: input.series.canonicalSeriesId,
              chapterNumber: { in: selectedNumbers },
              deletedAt: null,
              releases: {
                some: {
                  targetLanguage: "tr",
                  status: "PUBLISHED",
                  isPublic: true,
                },
              },
            },
            select: { chapterNumber: true },
          })
        : Promise.resolve([]),
    ])

  const completedNumbers = new Set([
    ...publishedChapters.map((chapter) => chapter.chapterNumber),
    ...completedCampaigns.flatMap((campaign) =>
      campaign.chapters.flatMap((chapter) => {
        const number = numberByRelatedId.get(chapter.sourceChapterId)
        return number ? [number] : []
      }),
    ),
  ])
  const activeJobNumbers = new Set(
    activeJobCampaigns.flatMap((campaign) =>
      campaign.chapters.flatMap((chapter) => {
        const number = numberByRelatedId.get(chapter.sourceChapterId)
        return number ? [number] : []
      }),
    ),
  )

  const items = uniqueIds.map<BatchEligibilityItem>((sourceChapterId) => {
    const chapter = chapterById.get(sourceChapterId)
    if (!chapter)
      return {
        sourceChapterId,
        chapterNumber: "—",
        eligible: false,
        exclusionReason: "Bölüm bu kaynakta bulunamadı veya kullanılamıyor.",
      }
    if (completedNumbers.has(chapter.number))
      return {
        sourceChapterId,
        chapterNumber: chapter.number,
        eligible: false,
        exclusionReason: "Bölümün Türkçe çevirisi zaten yayınlanmış.",
      }
    if (activeJobNumbers.has(chapter.number))
      return {
        sourceChapterId,
        chapterNumber: chapter.number,
        eligible: false,
        exclusionReason: "Bölüm için aktif bir çeviri işi zaten var.",
      }
    return {
      sourceChapterId,
      chapterNumber: chapter.number,
      eligible: true,
    }
  })
  const perChapterCredits =
    input.qualityTier === "premium"
      ? translationConfig.premiumCredits
      : translationConfig.balancedCredits
  const eligibleCount = items.filter((item) => item.eligible).length
  return {
    requestedCount: items.length,
    eligibleCount,
    excludedCount: items.length - eligibleCount,
    perChapterCredits,
    totalCredits: eligibleCount * perChapterCredits,
    items,
  }
}
