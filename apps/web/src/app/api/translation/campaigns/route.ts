import { randomUUID } from "node:crypto"
import { cacheClient } from "@taiyomoe/cache"
import { db } from "@taiyomoe/db"
import { after, type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { currentActiveUser } from "~/features/reading/server"
import { adjustPackageForExternalCompletion } from "~/features/translation/campaign-accounting"
import { refundCampaignExcess } from "~/features/translation/campaign-accounting.server"
import {
  backendPlatformForEdition,
  getTranslationJobDispatcher,
  queueTranslationCampaignJob,
} from "~/features/translation/job-dispatcher"
import { processMandownTranslationJob } from "~/features/translation/mandown-import"
import {
  quoteTranslation,
  translationConfig,
} from "~/features/translation/pricing"
import { getSourceCatalogProvider } from "~/features/translation/provider"
import type {
  PublicCatalogSeries,
  PublicSourceEdition,
  TranslationQuality,
} from "~/features/translation/types"
import { rejectCrossOriginWrite } from "~/utils/api-security"

const inputSchema = z.object({
  catalogSeriesId: z.string().min(1).max(120),
  sourceEditionId: z.string().min(1).max(120),
  chapterIds: z.array(z.string().min(1).max(160)).min(1).max(2_000),
  qualityTier: z.enum(["balanced", "premium"]),
  mode: z.enum(["community", "complete"]),
  credits: z.number().int().positive().max(1_000_000).optional(),
  communityCampaignId: z.string().uuid().optional(),
})

const activeStatuses = ["FUNDING", "FUNDED", "QUEUED", "PROCESSING"] as const
export const maxDuration = 1_800

const activeKey = (
  editionId: string,
  chapterId: string,
  quality: "balanced" | "premium",
) => `${editionId}:${chapterId}:tr:${quality}`

const instantActiveKey = (
  catalogSeriesId: string,
  chapterNumber: string,
  outputLanguage: string,
) => `instant:${catalogSeriesId}:${chapterNumber}:${outputLanguage}`

async function handleInstantTranslation(input: {
  userId: string
  idempotencyKey: string
  series: PublicCatalogSeries
  edition: PublicSourceEdition
  chapter: PublicSourceEdition["chapters"][number]
  qualityTier: TranslationQuality
  communityCampaignId?: string
}) {
  const instantPrice =
    input.qualityTier === "premium"
      ? translationConfig.premiumCredits
      : translationConfig.balancedCredits
  const relatedChapterIds = (
    await db.catalogSourceChapter.findMany({
      where: {
        chapterNumber: input.chapter.number,
        sourceEdition: { catalogSeriesId: input.series.id, isActive: true },
      },
      select: { id: true },
    })
  ).map((chapter) => chapter.id)

  try {
    const result = await db.$transaction(
      async (tx) => {
        const duplicate = await tx.translationCampaignChapter.findFirst({
          where: {
            activeKey: instantActiveKey(
              input.series.id,
              input.chapter.number,
              "tr",
            ),
            campaign: { status: { in: [...activeStatuses] } },
          },
          select: { campaignId: true },
        })
        if (duplicate)
          throw new Error(
            "Bu bölüm için anında çeviri işi zaten sırada veya çalışıyor.",
          )

        const packageItem =
          (input.communityCampaignId
            ? await tx.translationCampaignChapter.findFirst({
                where: {
                  campaignId: input.communityCampaignId,
                  sourceChapterId: { in: relatedChapterIds },
                  status: "PENDING",
                  campaign: {
                    kind: "COMMUNITY_PACKAGE",
                    status: { in: [...activeStatuses] },
                  },
                },
                include: { campaign: true },
              })
            : await tx.translationCampaignChapter.findFirst({
                where: {
                  sourceChapterId: { in: relatedChapterIds },
                  status: "PENDING",
                  campaign: {
                    kind: "COMMUNITY_PACKAGE",
                    sourceEditionId: input.edition.id,
                    qualityTier:
                      input.qualityTier === "premium" ? "PREMIUM" : "BALANCED",
                    outputLanguage: "tr",
                    status: "FUNDING",
                  },
                },
                include: { campaign: true },
              })) ?? null
        if (input.communityCampaignId && !packageItem)
          throw new Error(
            "Seçilen toplu talep artık aktif değil veya bu bölümü içermiyor.",
          )

        const account = await tx.creditAccount.upsert({
          where: { userId: input.userId },
          create: { userId: input.userId },
          update: {},
        })
        if (account.cachedBalance < instantPrice)
          throw new Error(
            `Yetersiz bakiye. ${instantPrice - account.cachedBalance} kredi eksik.`,
          )
        await tx.creditAccount.update({
          where: { userId: input.userId },
          data: { cachedBalance: { decrement: instantPrice } },
        })
        await tx.creditTransaction.create({
          data: {
            userId: input.userId,
            amount: -instantPrice,
            type: "CAMPAIGN_CONTRIBUTION",
            referenceType: "instant_translation",
            idempotencyKey: input.idempotencyKey,
            metadata: {
              catalogSeriesId: input.series.id,
              sourceEditionId: input.edition.id,
              chapterId: input.chapter.id,
              communityCampaignId: packageItem?.campaignId,
            },
          },
        })
        const instantCampaign = await tx.translationCampaign.create({
          data: {
            catalogSeriesId: input.series.id,
            sourceEditionId: input.edition.id,
            sourceLanguage: input.edition.sourceLanguage,
            outputLanguage: "tr",
            qualityTier:
              input.qualityTier === "premium" ? "PREMIUM" : "BALANCED",
            kind: "INSTANT",
            targetCredits: instantPrice,
            fundedCredits: instantPrice,
            status: "FUNDED",
            fundedAt: new Date(),
            createdById: input.userId,
            idempotencyKey: `${input.idempotencyKey}:campaign`,
            chapters: {
              create: {
                sourceChapterId: input.chapter.id,
                activeKey: instantActiveKey(
                  input.series.id,
                  input.chapter.number,
                  "tr",
                ),
                allocatedCredits: instantPrice,
              },
            },
            contributions: {
              create: {
                userId: input.userId,
                credits: instantPrice,
                idempotencyKey: `${input.idempotencyKey}:instant`,
              },
            },
          },
        })
        const instantJobId = await queueTranslationCampaignJob(
          tx,
          instantCampaign.id,
        )
        if (!instantJobId) throw new Error("Anında çeviri işi oluşturulamadı.")

        let adjustedCampaignId: string | undefined
        let communityJobId: string | undefined
        if (packageItem) {
          adjustedCampaignId = packageItem.campaignId
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
              externalTranslationJobId: instantJobId,
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
            input.idempotencyKey,
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
              status: adjustment.funded
                ? "FUNDED"
                : packageItem.campaign.status === "FUNDING"
                  ? "FUNDING"
                  : packageItem.campaign.status,
              ...(adjustment.funded ? { fundedAt: new Date() } : {}),
            },
          })
          const contributors = await tx.translationContribution.findMany({
            where: {
              campaignId: packageItem.campaignId,
            },
            distinct: ["userId"],
            select: { userId: true },
          })
          const expiresAt = new Date(
            Date.now() + translationConfig.earlyAccessHours * 60 * 60 * 1_000,
          )
          if (contributors.length) {
            await tx.translationEarlyAccessGrant.createMany({
              data: contributors.map((contributor) => ({
                userId: contributor.userId,
                sourceChapterId: packageItem.sourceChapterId,
                translationJobId: instantJobId,
                expiresAt,
              })),
              skipDuplicates: true,
            })
          }
          if (
            pendingCount > 0 &&
            adjustment.funded &&
            !packageItem.campaign.translationJobId
          )
            communityJobId = await queueTranslationCampaignJob(
              tx,
              packageItem.campaignId,
            )
        }
        return { instantJobId, adjustedCampaignId, communityJobId }
      },
      { isolationLevel: "Serializable" },
    )
    after(async () => {
      await Promise.allSettled(
        [result.instantJobId, result.communityJobId]
          .filter((jobId): jobId is string => Boolean(jobId))
          .map((jobId) => processMandownTranslationJob(jobId)),
      )
    })
    return NextResponse.json({
      message: packageItemMessage(result.adjustedCampaignId, instantPrice),
      queued: true,
      campaignId: result.adjustedCampaignId,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Anında çeviri başlatılamadı.",
      },
      { status: 409 },
    )
  }
}

function packageItemMessage(campaignId: string | undefined, credits: number) {
  return campaignId
    ? `${credits} kredi kullanıldı. Bölüm anında çeviriye alındı; toplu talebin hedefi ve iadeleri güncellendi.`
    : `${credits} kredi kullanıldı; anında çeviri işi kuyruğa alındı.`
}

export async function GET() {
  const user = await currentActiveUser()
  if (!user || user.banned)
    return NextResponse.json({
      authenticated: false,
      balance: 0,
      campaigns: [],
    })
  const [campaigns, account] = await Promise.all([
    db.translationCampaign.findMany({
      where: {
        kind: { not: "BATCH_INSTANT" },
        contributions: { some: { userId: user.id } },
      },
      include: {
        chapters: {
          include: {
            externalTranslationJob: { select: { status: true } },
          },
        },
        contributions: {
          where: { userId: user.id },
          select: { credits: true, refundedCredits: true },
        },
        _count: { select: { contributions: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
    db.creditAccount.findUnique({
      where: { userId: user.id },
      select: { cachedBalance: true },
    }),
  ])
  const catalogSeries = await db.catalogSeries.findMany({
    where: {
      id: { in: campaigns.map((campaign) => campaign.catalogSeriesId) },
    },
    select: {
      id: true,
      title: true,
      canonicalSeriesId: true,
    },
  })
  const sourceEditions = await db.catalogSourceEdition.findMany({
    where: {
      id: { in: campaigns.map((campaign) => campaign.sourceEditionId) },
      isActive: true,
    },
    select: {
      id: true,
      publicSourceLabel: true,
      sourceLanguage: true,
      chapters: {
        where: { isAvailable: true },
        orderBy: { sortKey: "asc" },
        select: { id: true, chapterNumber: true, sortKey: true },
      },
    },
  })
  const canonicalSeries = await db.series.findMany({
    where: {
      id: {
        in: catalogSeries.flatMap((series) =>
          series.canonicalSeriesId ? [series.canonicalSeriesId] : [],
        ),
      },
      deletedAt: null,
    },
    select: {
      id: true,
      slug: true,
      chapters: {
        where: { deletedAt: null },
        orderBy: { sortKey: "desc" },
        take: 1,
        select: { sortKey: true },
      },
    },
  })
  const canonicalById = new Map(
    canonicalSeries.map((series) => [series.id, series]),
  )
  const catalogById = new Map(
    catalogSeries.map((series) => [series.id, series]),
  )
  const editionById = new Map(
    sourceEditions.map((edition) => [edition.id, edition]),
  )
  return NextResponse.json({
    authenticated: true,
    balance: account?.cachedBalance ?? 0,
    campaigns: campaigns.map((campaign) => {
      const catalog = catalogById.get(campaign.catalogSeriesId)
      const canonical = catalog?.canonicalSeriesId
        ? canonicalById.get(catalog.canonicalSeriesId)
        : undefined
      const edition = editionById.get(campaign.sourceEditionId)
      const latestPublishedSortKey = canonical?.chapters[0]?.sortKey ?? -1
      const continuationChapter = edition?.chapters.find(
        (chapter) => chapter.sortKey > latestPublishedSortKey,
      )
      const selectedIds = new Set(
        campaign.chapters.map((chapter) => chapter.sourceChapterId),
      )
      const statusByChapterId = new Map(
        campaign.chapters.map((chapter) => [
          chapter.sourceChapterId,
          chapter.status === "COMPLETED_EXTERNALLY"
            ? (chapter.externalTranslationJob?.status ?? "QUEUED")
            : chapter.status === "COMPLETED"
              ? "COMPLETED"
              : campaign.status,
        ]),
      )
      const selectedChapters =
        edition?.chapters.filter((chapter) => selectedIds.has(chapter.id)) ?? []
      const qualityTier =
        campaign.qualityTier === "PREMIUM" ? "premium" : "balanced"
      const outputLanguage = campaign.outputLanguage.toLowerCase()
      return {
        id: campaign.id,
        status: campaign.status,
        qualityTier,
        translationType: "ai",
        outputLanguage,
        targetCredits: campaign.targetCredits,
        fundedCredits: campaign.fundedCredits,
        chapterIds: campaign.chapters.map((chapter) => chapter.sourceChapterId),
        chapterProgressStatuses: selectedChapters.map(
          (chapter) => statusByChapterId.get(chapter.id) ?? "PENDING",
        ),
        remainingChapterCount: campaign.chapters.filter(
          (chapter) => chapter.status === "PENDING",
        ).length,
        completedExternallyCount: campaign.chapters.filter(
          (chapter) => chapter.status === "COMPLETED_EXTERNALLY",
        ).length,
        chapterNumbers: selectedChapters.map(
          (chapter) => chapter.chapterNumber,
        ),
        contributorCount: campaign._count.contributions,
        ownCredits: campaign.contributions.reduce(
          (sum, contribution) =>
            sum + contribution.credits - contribution.refundedCredits,
          0,
        ),
        seriesTitle: catalog?.title ?? "Mandown serisi",
        catalogSeriesId: campaign.catalogSeriesId,
        sourceEditionId: campaign.sourceEditionId,
        sourceLabel: edition?.publicSourceLabel ?? "Bilinmeyen kaynak",
        sourceLanguage: edition?.sourceLanguage.toLowerCase(),
        continuationChapterNumber: continuationChapter?.chapterNumber,
        continuationHref: continuationChapter
          ? `/translate/${campaign.catalogSeriesId}?sourceEditionId=${campaign.sourceEditionId}&quality=${qualityTier}&outputLanguage=${outputLanguage}&nextChapter=${encodeURIComponent(
              continuationChapter.chapterNumber,
            )}&selectionMode=range&fromContinuation=1`
          : undefined,
        coverUrl: `/api/translation/catalog/${campaign.catalogSeriesId}/cover`,
        seriesSlug: canonical?.slug,
        updatedAt: campaign.updatedAt,
        expiresAt: campaign.expiresAt,
      }
    }),
  })
}

export async function POST(request: NextRequest) {
  const rejected = rejectCrossOriginWrite(request)
  if (rejected) return rejected
  const user = await currentActiveUser()
  if (!user || user.banned)
    return NextResponse.json(
      { error: "Katkı yapmak için giriş yapmalısınız." },
      { status: 401 },
    )
  const idempotencyKey = request.headers.get("idempotency-key")
  if (!idempotencyKey || idempotencyKey.length > 120)
    return NextResponse.json(
      { error: "Geçerli Idempotency-Key gerekli." },
      { status: 400 },
    )
  const limit = await cacheClient.rateLimit.consume(
    `translation-campaign:${user.id}`,
    30,
    3_600,
  )
  if (!limit.allowed)
    return NextResponse.json(
      { error: "Saatlik çeviri katkı sınırına ulaştınız." },
      { status: 429 },
    )
  const parsed = inputSchema.safeParse(await request.json())
  if (!parsed.success)
    return NextResponse.json(
      { error: "Geçersiz çeviri talebi." },
      { status: 400 },
    )
  if (parsed.data.mode === "community" && !parsed.data.credits)
    return NextResponse.json(
      { error: "Katkı için pozitif bir kredi tutarı girilmelidir." },
      { status: 400 },
    )

  const provider = getSourceCatalogProvider()
  const series = await provider.getSeriesDetails(parsed.data.catalogSeriesId)
  const edition = series?.editions.find(
    (item) => item.id === parsed.data.sourceEditionId,
  )
  if (!series || !edition)
    return NextResponse.json({ error: "Kaynak bulunamadı." }, { status: 404 })
  const selected = parsed.data.chapterIds.map((id) =>
    edition.chapters.find((chapter) => chapter.id === id),
  )
  if (selected.some((chapter) => !chapter))
    return NextResponse.json(
      { error: "Seçilen bölümler bu kaynağa ait değil." },
      { status: 400 },
    )
  const priceQuote = quoteTranslation({
    chapters: selected.map((chapter) => ({
      id: chapter!.id,
      number: chapter!.number,
    })),
    qualityTier: parsed.data.qualityTier,
  })

  const existingTransaction = await db.creditTransaction.findUnique({
    where: { idempotencyKey },
  })
  if (existingTransaction)
    return NextResponse.json({
      message: "Bu katkı daha önce işlendi.",
      idempotent: true,
    })

  if (parsed.data.mode === "complete") {
    if (selected.length !== 1)
      return NextResponse.json(
        {
          error:
            "Anında çeviri yalnızca tek bölüm için kullanılabilir. Bölüm aralığı için toplu destek oluşturun.",
        },
        { status: 400 },
      )
    return handleInstantTranslation({
      userId: user.id,
      idempotencyKey,
      series,
      edition,
      chapter: selected[0]!,
      qualityTier: parsed.data.qualityTier,
      communityCampaignId: parsed.data.communityCampaignId,
    })
  }

  try {
    const result = await db.$transaction(
      async (tx) => {
        const instantDuplicate = await tx.translationCampaignChapter.findFirst({
          where: {
            activeKey: {
              in: selected.map((chapter) =>
                instantActiveKey(series.id, chapter!.number, "tr"),
              ),
            },
            campaign: { status: { in: [...activeStatuses] } },
          },
          select: { sourceChapterId: true },
        })
        if (instantDuplicate)
          throw new Error(
            "Seçilen bölümlerden biri için anında çeviri işi zaten çalışıyor.",
          )
        const keys = selected.map((chapter) =>
          activeKey(edition.id, chapter!.id, parsed.data.qualityTier),
        )
        const occupied = await tx.translationCampaignChapter.findMany({
          where: { activeKey: { in: keys } },
          include: { campaign: true },
        })
        const occupiedIds = new Set(
          occupied.map((item) => item.sourceChapterId),
        )
        const newChapters = selected.filter(
          (chapter) => !occupiedIds.has(chapter!.id),
        )
        const campaigns = [
          ...new Map(
            occupied
              .filter((item) =>
                activeStatuses.includes(
                  item.campaign.status as (typeof activeStatuses)[number],
                ),
              )
              .map((item) => [item.campaign.id, item.campaign]),
          ).values(),
        ]
        if (newChapters.length) {
          const newTarget =
            newChapters.length *
            (parsed.data.qualityTier === "premium"
              ? translationConfig.premiumCredits
              : translationConfig.balancedCredits)
          const created = await tx.translationCampaign.create({
            data: {
              catalogSeriesId: series.id,
              sourceEditionId: edition.id,
              sourceLanguage: edition.sourceLanguage,
              outputLanguage: "tr",
              qualityTier:
                parsed.data.qualityTier === "premium" ? "PREMIUM" : "BALANCED",
              kind: "COMMUNITY_PACKAGE",
              targetCredits: newTarget,
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1_000),
              createdById: user.id,
              idempotencyKey: `${idempotencyKey}:campaign`,
              chapters: {
                create: newChapters.map((chapter) => ({
                  sourceChapterId: chapter!.id,
                  activeKey: activeKey(
                    edition.id,
                    chapter!.id,
                    parsed.data.qualityTier,
                  ),
                  allocatedCredits: priceQuote.perChapterCredits,
                })),
              },
            },
          })
          campaigns.push(created)
        }
        const totalRemaining = campaigns.reduce(
          (sum, campaign) =>
            sum + Math.max(0, campaign.targetCredits - campaign.fundedCredits),
          0,
        )
        const requested =
          parsed.data.mode === "complete"
            ? totalRemaining
            : Math.min(parsed.data.credits!, totalRemaining)
        if (requested <= 0)
          throw new Error("Çeviri talebi zaten tamamen fonlandı.")

        const account = await tx.creditAccount.upsert({
          where: { userId: user.id },
          create: { userId: user.id },
          update: {},
        })
        if (account.cachedBalance < requested)
          throw new Error(
            `Yetersiz bakiye. ${requested - account.cachedBalance} kredi eksik.`,
          )
        await tx.creditAccount.update({
          where: { userId: user.id },
          data: { cachedBalance: { decrement: requested } },
        })
        await tx.creditTransaction.create({
          data: {
            userId: user.id,
            amount: -requested,
            type: "CAMPAIGN_CONTRIBUTION",
            referenceType: "translation_campaign_group",
            referenceId: campaigns.map((campaign) => campaign.id).join(","),
            idempotencyKey,
            metadata: {
              catalogSeriesId: series.id,
              sourceEditionId: edition.id,
              chapterIds: parsed.data.chapterIds,
            },
          },
        })

        let unallocated = requested
        const fundedCampaignIds: string[] = []
        for (const [index, campaign] of campaigns.entries()) {
          if (unallocated <= 0) break
          const remaining = Math.max(
            0,
            campaign.targetCredits - campaign.fundedCredits,
          )
          const credits = Math.min(unallocated, remaining)
          if (!credits) continue
          const updated = await tx.translationCampaign.update({
            where: { id: campaign.id },
            data: {
              fundedCredits: { increment: credits },
              ...(campaign.fundedCredits + credits >= campaign.targetCredits
                ? { status: "FUNDED", fundedAt: new Date() }
                : {}),
            },
          })
          await tx.translationContribution.create({
            data: {
              campaignId: campaign.id,
              userId: user.id,
              credits,
              idempotencyKey: `${idempotencyKey}:${index}`,
            },
          })
          unallocated -= credits
          if (updated.status === "FUNDED") {
            fundedCampaignIds.push(updated.id)
            const chapters = await tx.translationCampaignChapter.findMany({
              where: { campaignId: updated.id },
              select: { sourceChapterId: true },
            })
            const jobId = randomUUID()
            const jobInput =
              await getTranslationJobDispatcher().enqueueTranslation({
                canonicalSeriesId: series.canonicalSeriesId,
                catalogSeriesId: series.id,
                sourceEditionId: edition.id,
                externalChapterIds: chapters.map(
                  (chapter) =>
                    edition.chapters.find(
                      (item) => item.id === chapter.sourceChapterId,
                    )?.externalChapterId ?? chapter.sourceChapterId,
                ),
                backendPlatform: await backendPlatformForEdition(edition.id),
                sourceLanguage: edition.sourceLanguage,
                outputLanguage: "tr",
                qualityTier: parsed.data.qualityTier,
                pipelineVersion: "mandown-1.12.2",
                callbackUrl: `/api/translation/jobs/${jobId}/callback`,
                idempotencyKey: `translation-job:${updated.id}`,
              })
            await tx.translationJob.create({
              data: {
                id: jobId,
                campaignId: updated.id,
                provider: jobInput.provider,
                payload: jobInput.payload,
                idempotencyKey: `translation-job:${updated.id}`,
              },
            })
            await tx.translationCampaign.update({
              where: { id: updated.id },
              data: { status: "QUEUED", translationJobId: jobId },
            })
            await tx.siteNotification.upsert({
              where: {
                dedupeKey: `translation-funded:${updated.id}:${user.id}`,
              },
              create: {
                userId: user.id,
                type: "TRANSLATION_CAMPAIGN",
                title: "Çeviri fonlandı",
                message: `${series.title} çeviri talebi kuyruğa alındı.`,
                href: "/translate/serilerim",
                dedupeKey: `translation-funded:${updated.id}:${user.id}`,
              },
              update: {},
            })
          }
        }
        return { requested, fundedCampaignIds }
      },
      { isolationLevel: "Serializable" },
    )
    const fundedJobs = result.fundedCampaignIds.length
      ? await db.translationJob.findMany({
          where: { campaignId: { in: result.fundedCampaignIds } },
          select: { id: true },
        })
      : []
    if (fundedJobs.length) {
      after(async () => {
        await Promise.allSettled(
          fundedJobs.map((job) => processMandownTranslationJob(job.id)),
        )
      })
    }
    return NextResponse.json({
      message: fundedJobs.length
        ? `${result.requested} kredi kullanıldı; Mandown işi kuyruğa alındı.`
        : `${result.requested} kredi katkınız kaydedildi.`,
      fundedCampaignIds: result.fundedCampaignIds,
      queued: fundedJobs.length > 0,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Katkı kaydedilemedi."
    return NextResponse.json({ error: message }, { status: 409 })
  }
}
