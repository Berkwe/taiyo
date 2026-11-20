import { cacheClient } from "@taiyomoe/cache"
import { db } from "@taiyomoe/db"
import { after, type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { currentActiveUser } from "~/features/reading/server"
import {
  batchStatusFromItems,
  evaluateBatchEligibility,
} from "~/features/translation/batch-instant"
import { adjustPackageForExternalCompletion } from "~/features/translation/campaign-accounting"
import { refundCampaignExcess } from "~/features/translation/campaign-accounting.server"
import { queueTranslationCampaignJob } from "~/features/translation/job-dispatcher"
import { processMandownTranslationJob } from "~/features/translation/mandown-import"
import { translationConfig } from "~/features/translation/pricing"
import {
  loadPublicCatalogSelection,
  paidSourceNotice,
} from "~/features/translation/provider"
import { rejectCrossOriginWrite } from "~/utils/api-security"

const schema = z
  .object({
    catalogSeriesId: z.string().min(1).max(120),
    sourceEditionId: z.string().min(1).max(120),
    chapterIds: z.array(z.string().min(1).max(160)).min(2).max(10),
    qualityTier: z.enum(["balanced", "premium"]),
  })
  .refine((value) => new Set(value.chapterIds).size >= 2)

export const maxDuration = 1_800

class BatchBalanceError extends Error {
  constructor(
    readonly missingCredits: number,
    readonly quote: Awaited<ReturnType<typeof evaluateBatchEligibility>>,
  ) {
    super(`Yetersiz bakiye. ${missingCredits} kredi eksik.`)
  }
}

async function serializeBatch(batchId: string, userId: string) {
  const batch = await db.batchTranslationRequest.findFirst({
    where: { id: batchId, userId },
    include: {
      items: {
        include: {
          translationJob: {
            select: { failureReason: true, status: true },
          },
        },
        orderBy: [{ chapterNumber: "asc" }, { createdAt: "asc" }],
      },
    },
  })
  if (!batch) return null
  const currentStatus = batchStatusFromItems(
    batch.items.map((item) => item.status),
  )
  const catalog = await db.catalogSeries.findUnique({
    where: { id: batch.catalogSeriesId },
    select: { title: true },
  })
  return {
    id: batch.id,
    status: currentStatus,
    seriesTitle: catalog?.title ?? "Mandown serisi",
    coverUrl: `/api/translation/catalog/${batch.catalogSeriesId}/cover`,
    qualityTier:
      batch.qualityTier === "PREMIUM"
        ? ("premium" as const)
        : ("balanced" as const),
    outputLanguage: batch.outputLanguage.toLowerCase(),
    requestedCount: batch.requestedCount,
    eligibleCount: batch.eligibleCount,
    excludedCount: batch.excludedCount,
    totalCredits: batch.totalCredits,
    createdAt: batch.createdAt,
    completedAt: batch.completedAt,
    items: batch.items.map((item) => ({
      id: item.id,
      sourceChapterId: item.sourceChapterId,
      chapterNumber: item.chapterNumber,
      status: item.status,
      credits: item.credits,
      exclusionReason: item.exclusionReason,
      failureReason: item.translationJob?.failureReason,
      jobStatus: item.translationJob?.status,
    })),
  }
}

export async function GET() {
  const user = await currentActiveUser()
  if (!user || user.banned)
    return NextResponse.json({ authenticated: false, batches: [] })
  const rows = await db.batchTranslationRequest.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true },
  })
  const batches = (
    await Promise.all(rows.map((row) => serializeBatch(row.id, user.id)))
  ).filter((batch): batch is NonNullable<typeof batch> => Boolean(batch))
  return NextResponse.json({ authenticated: true, batches })
}

export async function POST(request: NextRequest) {
  const rejected = rejectCrossOriginWrite(request)
  if (rejected) return rejected
  const user = await currentActiveUser()
  if (!user || user.banned)
    return NextResponse.json(
      { error: "Anında çeviri için giriş yapmalısınız." },
      { status: 401 },
    )
  const idempotencyKey = request.headers.get("idempotency-key")
  if (!idempotencyKey || idempotencyKey.length > 120)
    return NextResponse.json(
      { error: "Geçerli Idempotency-Key gerekli." },
      { status: 400 },
    )
  const parsed = schema.safeParse(await request.json())
  if (!parsed.success)
    return NextResponse.json(
      { error: "Geçersiz çoklu anında çeviri seçimi." },
      { status: 400 },
    )
  const existing = await db.batchTranslationRequest.findUnique({
    where: { idempotencyKey },
    select: { id: true, userId: true },
  })
  if (existing) {
    if (existing.userId !== user.id)
      return NextResponse.json(
        { error: "İşlem anahtarı kullanılmış." },
        { status: 409 },
      )
    return NextResponse.json({
      batch: await serializeBatch(existing.id, user.id),
      idempotent: true,
    })
  }
  const limit = await cacheClient.rateLimit.consume(
    `batch-instant-translation:${user.id}`,
    10,
    3_600,
  )
  if (!limit.allowed)
    return NextResponse.json(
      { error: "Saatlik çoklu anında çeviri sınırına ulaştınız." },
      { status: 429 },
    )

  const selection = await loadPublicCatalogSelection(
    parsed.data.catalogSeriesId,
    parsed.data.sourceEditionId,
  )
  if (!selection)
    return NextResponse.json({ error: "Kaynak bulunamadı." }, { status: 404 })
  const { series, edition } = selection
  if (edition.accessStatus !== "available")
    return NextResponse.json({ error: paidSourceNotice }, { status: 409 })

  try {
    const result = await db.$transaction(
      async (tx) => {
        const quote = await evaluateBatchEligibility({
          tx,
          series,
          edition,
          requestedChapterIds: parsed.data.chapterIds,
          qualityTier: parsed.data.qualityTier,
        })
        if (!quote.eligibleCount)
          throw new Error(
            "Seçilen bölümlerin hiçbiri anında çeviriye uygun değil.",
          )

        const account = await tx.creditAccount.upsert({
          where: { userId: user.id },
          create: { userId: user.id },
          update: {},
        })
        if (account.cachedBalance < quote.totalCredits)
          throw new BatchBalanceError(
            quote.totalCredits - account.cachedBalance,
            quote,
          )

        const batch = await tx.batchTranslationRequest.create({
          data: {
            userId: user.id,
            catalogSeriesId: series.id,
            sourceEditionId: edition.id,
            outputLanguage: "tr",
            qualityTier:
              parsed.data.qualityTier === "premium" ? "PREMIUM" : "BALANCED",
            requestedCount: quote.requestedCount,
            eligibleCount: quote.eligibleCount,
            excludedCount: quote.excludedCount,
            totalCredits: quote.totalCredits,
            idempotencyKey,
            items: {
              create: quote.items.map((item) => ({
                sourceChapterId: item.sourceChapterId,
                chapterNumber: item.chapterNumber,
                status: item.eligible ? "QUEUED" : "EXCLUDED",
                credits: item.eligible ? quote.perChapterCredits : 0,
                exclusionReason: item.exclusionReason,
              })),
            },
          },
          include: { items: true },
        })
        await tx.creditAccount.update({
          where: { userId: user.id },
          data: { cachedBalance: { decrement: quote.totalCredits } },
        })
        await tx.creditTransaction.create({
          data: {
            userId: user.id,
            amount: -quote.totalCredits,
            type: "CAMPAIGN_CONTRIBUTION",
            referenceType: "batch_instant_translation",
            referenceId: batch.id,
            idempotencyKey,
            metadata: {
              catalogSeriesId: series.id,
              sourceEditionId: edition.id,
              eligibleChapterIds: quote.items
                .filter((item) => item.eligible)
                .map((item) => item.sourceChapterId),
              excludedChapterIds: quote.items
                .filter((item) => !item.eligible)
                .map((item) => item.sourceChapterId),
            },
          },
        })

        const jobIds: string[] = []
        for (const item of quote.items.filter((entry) => entry.eligible)) {
          const campaign = await tx.translationCampaign.create({
            data: {
              catalogSeriesId: series.id,
              sourceEditionId: edition.id,
              sourceLanguage: edition.sourceLanguage,
              outputLanguage: "tr",
              qualityTier:
                parsed.data.qualityTier === "premium" ? "PREMIUM" : "BALANCED",
              kind: "BATCH_INSTANT",
              targetCredits: quote.perChapterCredits,
              fundedCredits: quote.perChapterCredits,
              status: "FUNDED",
              fundedAt: new Date(),
              createdById: user.id,
              idempotencyKey: `${idempotencyKey}:campaign:${item.sourceChapterId}`,
              chapters: {
                create: {
                  sourceChapterId: item.sourceChapterId,
                  activeKey: `instant:${series.id}:${item.chapterNumber}:tr`,
                  allocatedCredits: quote.perChapterCredits,
                },
              },
              contributions: {
                create: {
                  userId: user.id,
                  credits: quote.perChapterCredits,
                  idempotencyKey: `${idempotencyKey}:contribution:${item.sourceChapterId}`,
                },
              },
            },
          })
          const jobId = await queueTranslationCampaignJob(tx, campaign.id)
          if (!jobId)
            throw new Error(
              `Bölüm ${item.chapterNumber} için çeviri işi oluşturulamadı.`,
            )
          jobIds.push(jobId)
          await tx.batchTranslationRequestItem.update({
            where: {
              batchRequestId_sourceChapterId: {
                batchRequestId: batch.id,
                sourceChapterId: item.sourceChapterId,
              },
            },
            data: { campaignId: campaign.id, translationJobId: jobId },
          })

          const relatedChapterIds = (
            await tx.catalogSourceChapter.findMany({
              where: {
                chapterNumber: item.chapterNumber,
                sourceEdition: { catalogSeriesId: series.id, isActive: true },
              },
              select: { id: true },
            })
          ).map((chapter) => chapter.id)
          const packageItem =
            (await tx.translationCampaignChapter.findFirst({
              where: {
                sourceChapterId: { in: relatedChapterIds },
                status: "PENDING",
                campaign: {
                  kind: "COMMUNITY_PACKAGE",
                  sourceEditionId: edition.id,
                  qualityTier:
                    parsed.data.qualityTier === "premium"
                      ? "PREMIUM"
                      : "BALANCED",
                  outputLanguage: "tr",
                  status: "FUNDING",
                },
              },
              include: { campaign: true },
            })) ?? null
          if (!packageItem) continue

          await tx.translationCampaignChapter.update({
            where: {
              campaignId_sourceChapterId: {
                campaignId: packageItem.campaignId,
                sourceChapterId: packageItem.sourceChapterId,
              },
            },
            data: {
              status: "COMPLETED_EXTERNALLY",
              completedAt: new Date(),
              externalTranslationJobId: jobId,
              externalPreviousActiveKey: packageItem.activeKey,
              externalPreviousCampaignStatus: packageItem.campaign.status,
              activeKey: null,
            },
          })
          const adjustment = adjustPackageForExternalCompletion({
            targetCredits: packageItem.campaign.targetCredits,
            fundedCredits: packageItem.campaign.fundedCredits,
            allocatedCredits: packageItem.allocatedCredits,
          })
          await refundCampaignExcess(
            tx,
            packageItem.campaignId,
            adjustment.refundCredits,
            `${idempotencyKey}:package:${packageItem.campaignId}:${item.sourceChapterId}`,
          )
          const pendingCount = await tx.translationCampaignChapter.count({
            where: {
              campaignId: packageItem.campaignId,
              status: "PENDING",
            },
          })
          await tx.translationCampaign.update({
            where: { id: packageItem.campaignId },
            data: {
              targetCredits: adjustment.targetCredits,
              fundedCredits: adjustment.fundedCredits,
              status: adjustment.funded ? "FUNDED" : "FUNDING",
              ...(adjustment.funded
                ? { fundedAt: new Date() }
                : { fundedAt: null }),
            },
          })
          if (
            pendingCount > 0 &&
            adjustment.funded &&
            !packageItem.campaign.translationJobId
          ) {
            const communityJobId = await queueTranslationCampaignJob(
              tx,
              packageItem.campaignId,
            )
            if (communityJobId) jobIds.push(communityJobId)
          }
          const contributors = await tx.translationContribution.findMany({
            where: { campaignId: packageItem.campaignId },
            distinct: ["userId"],
            select: { userId: true },
          })
          const expiresAt = new Date(
            Date.now() + translationConfig.earlyAccessHours * 60 * 60 * 1_000,
          )
          if (contributors.length)
            await tx.translationEarlyAccessGrant.createMany({
              data: contributors.map((contributor) => ({
                userId: contributor.userId,
                sourceChapterId: packageItem.sourceChapterId,
                translationJobId: jobId,
                expiresAt,
              })),
              skipDuplicates: true,
            })
        }
        return { batchId: batch.id, jobIds }
      },
      { isolationLevel: "Serializable" },
    )

    after(async () => {
      await Promise.allSettled(
        result.jobIds.map((jobId) => processMandownTranslationJob(jobId)),
      )
    })
    return NextResponse.json(
      {
        batch: await serializeBatch(result.batchId, user.id),
        message: "Çoklu anında çeviri işleri başlatıldı.",
      },
      { status: 201 },
    )
  } catch (error) {
    if (error instanceof BatchBalanceError)
      return NextResponse.json(
        {
          error: error.message,
          missingCredits: error.missingCredits,
          quote: error.quote,
        },
        { status: 409 },
      )
    const replay = await db.batchTranslationRequest.findUnique({
      where: { idempotencyKey },
      select: { id: true, userId: true },
    })
    if (replay?.userId === user.id)
      return NextResponse.json({
        batch: await serializeBatch(replay.id, user.id),
        idempotent: true,
      })
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Çoklu anında çeviri başlatılamadı.",
      },
      { status: 409 },
    )
  }
}
