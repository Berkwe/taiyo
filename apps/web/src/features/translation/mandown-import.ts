import { randomUUID } from "node:crypto"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { db, Prisma } from "@taiyomoe/db"
import { checksum, getStorage } from "@taiyomoe/storage"
import { parseCbz, parseImage } from "@taiyomoe/storage/cbz"
import { slugify } from "../platform/paths"
import { batchStatusFromItems } from "./batch-instant"
import { restorePackageAfterInstantFailure } from "./campaign-accounting"
import {
  type MandownBackendPlatform,
  runMandownTranslationDownload,
  type TranslationJobPayload,
} from "./job-dispatcher"
import { translationConfig } from "./pricing"

export function safeMandownDownloadPath(
  downloadRoot: string,
  archivePath: string,
) {
  const root = path.resolve(downloadRoot)
  const candidate = path.resolve(archivePath)
  if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) {
    throw new Error("Mandown dosya yolu indirme dizininin dışında.")
  }
  return candidate
}

export function filterMissingCatalogChapters<
  T extends { chapterNumber: string },
>(catalogChapters: T[], existingChapterNumbers: Iterable<string>) {
  const existing = new Set(existingChapterNumbers)
  return catalogChapters.filter(
    (chapter) => !existing.has(chapter.chapterNumber),
  )
}

export function translationFollowerIds(
  createdById: string,
  contributorIds: Iterable<string>,
) {
  return [...new Set([createdById, ...contributorIds])]
}

async function updateBatchItemForJob(
  tx: Prisma.TransactionClient,
  jobId: string,
  status: "PROCESSING" | "COMPLETED" | "FAILED",
  completedAt?: Date,
) {
  const item = await tx.batchTranslationRequestItem.findUnique({
    where: { translationJobId: jobId },
    select: { id: true, batchRequestId: true },
  })
  if (!item) return
  await tx.batchTranslationRequestItem.update({
    where: { id: item.id },
    data: {
      status,
      completedAt: completedAt ?? null,
    },
  })
  const items = await tx.batchTranslationRequestItem.findMany({
    where: { batchRequestId: item.batchRequestId },
    select: { status: true },
  })
  const batchStatus = batchStatusFromItems(
    items.map((batchItem) => batchItem.status),
  )
  await tx.batchTranslationRequest.update({
    where: { id: item.batchRequestId },
    data: {
      status: batchStatus,
      completedAt:
        batchStatus === "COMPLETED" ||
        batchStatus === "PARTIAL_FAILED" ||
        batchStatus === "FAILED"
          ? (completedAt ?? new Date())
          : null,
    },
  })
}

async function downloadImage(url: string) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Mandown kapağı indirilemedi (${response.status}).`)
  }
  const body = await response.arrayBuffer()
  return new Uint8Array(body as ArrayBuffer)
}

async function canonicalSeries(catalogSeriesId: string) {
  const catalog = await db.catalogSeries.findUniqueOrThrow({
    where: { id: catalogSeriesId, isActive: true },
  })
  const description =
    catalog.description ||
    "Mandown kaynağından indirilen orijinal bölüm yayını."
  if (catalog.canonicalSeriesId) {
    const existing = await db.series.findFirst({
      where: { id: catalog.canonicalSeriesId, deletedAt: null },
    })
    if (existing) {
      return db.series.update({
        where: { id: existing.id },
        data: {
          status:
            catalog.publicationStatus === "COMPLETED"
              ? "COMPLETED"
              : catalog.publicationStatus === "HIATUS"
                ? "HIATUS"
                : "ONGOING",
          localizations: {
            upsert: {
              where: {
                seriesId_locale: { seriesId: existing.id, locale: "tr" },
              },
              create: {
                locale: "tr",
                title: catalog.title,
                description,
              },
              update: { title: catalog.title, description },
            },
          },
        },
      })
    }
  }

  const stableSlug = `${slugify(catalog.title) || "mandown-serisi"}-${catalog.id.slice(0, 8)}`
  return db.$transaction(async (tx) => {
    const existingCatalog = await tx.catalogSeries.findUniqueOrThrow({
      where: { id: catalog.id },
    })
    if (existingCatalog.canonicalSeriesId) {
      const existing = await tx.series.findFirst({
        where: { id: existingCatalog.canonicalSeriesId, deletedAt: null },
      })
      if (existing) {
        return tx.series.update({
          where: { id: existing.id },
          data: {
            localizations: {
              upsert: {
                where: {
                  seriesId_locale: { seriesId: existing.id, locale: "tr" },
                },
                create: {
                  locale: "tr",
                  title: catalog.title,
                  description,
                },
                update: { title: catalog.title, description },
              },
            },
          },
        })
      }
    }
    const created = await tx.series.upsert({
      where: { slug: stableSlug },
      create: {
        slug: stableSlug,
        originalLanguage: catalog.providerKey.endsWith(":naver") ? "ko" : "en",
        type: "WEBTOON",
        status:
          catalog.publicationStatus === "COMPLETED"
            ? "COMPLETED"
            : catalog.publicationStatus === "HIATUS"
              ? "HIATUS"
              : "ONGOING",
        publishedAt: new Date(),
        isSearchable: true,
        isIndexable: true,
        localizations: {
          create: {
            locale: "tr",
            title: catalog.title,
            description,
          },
        },
      },
      update: {},
    })
    const synced = await tx.series.update({
      where: { id: created.id },
      data: {
        localizations: {
          upsert: {
            where: {
              seriesId_locale: { seriesId: created.id, locale: "tr" },
            },
            create: { locale: "tr", title: catalog.title, description },
            update: { title: catalog.title, description },
          },
        },
      },
    })
    await tx.catalogSeries.update({
      where: { id: catalog.id },
      data: { canonicalSeriesId: synced.id },
    })
    return synced
  })
}

async function importArchive(input: {
  actorId: string
  archivePath: string
  catalogChapter: {
    externalChapterId: string
    chapterNumber: string
    sortKey: number
    title: string | null
  }
  downloadRoot: string
  payload: TranslationJobPayload
  seriesId: string
  source: {
    backendPlatform: MandownBackendPlatform
    publicDescription: string
    publicSourceLabel: string
    sourceUrl: string | null
  }
}) {
  const existingChapter = await db.platformChapter.findUnique({
    where: {
      seriesId_chapterNumber: {
        seriesId: input.seriesId,
        chapterNumber: input.catalogChapter.chapterNumber,
      },
    },
    select: { id: true },
  })
  if (existingChapter) return null

  const profile = await db.translationProfile.upsert({
    where: { slug: "mandown-download" },
    create: {
      slug: "mandown-download",
      labelKey: "Novora AI Translation",
      descriptionKey: "Novora AI çeviri sistemiyle hazırlanan sürüm",
      sortOrder: 20,
      isAiGenerated: true,
      isHumanReviewed: false,
      isPublic: true,
      isIndexable: false,
    },
    update: {
      labelKey: "Novora AI Translation",
      descriptionKey: "Novora AI çeviri sistemiyle hazırlanan sürüm",
      isAiGenerated: true,
      isHumanReviewed: false,
    },
  })
  const chapterSlug = `bolum-${slugify(input.catalogChapter.chapterNumber) || input.catalogChapter.sortKey}`
  let chapter: { id: string }
  try {
    chapter = await db.platformChapter.create({
      data: {
        seriesId: input.seriesId,
        chapterNumber: input.catalogChapter.chapterNumber,
        canonicalSlug: chapterSlug,
        sortKey: input.catalogChapter.sortKey,
        localizations: {
          create: { locale: "tr", title: input.catalogChapter.title },
        },
      },
    })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return null
    }
    throw error
  }
  let source = await db.chapterSource.findFirst({
    where: {
      chapterId: chapter.id,
      platform: input.source.backendPlatform,
      externalId: input.catalogChapter.externalChapterId,
    },
  })
  source ??= await db.chapterSource.create({
    data: {
      chapterId: chapter.id,
      platform: input.source.backendPlatform,
      language: input.payload.sourceLanguage,
      displayLabel: input.source.publicSourceLabel,
      description: input.source.publicDescription,
      priority: 100,
      isDefault: true,
      sourceUrl: input.source.sourceUrl,
      externalId: input.catalogChapter.externalChapterId,
    },
  })
  const qualityTier =
    input.payload.qualityTier === "premium" ? "PREMIUM" : "BALANCED"

  const existing = await db.chapterRelease.findFirst({
    where: {
      sourceId: source.id,
      targetLanguage: "tr",
      qualityTier,
      pipelineVersion: input.payload.pipelineVersion,
      deletedAt: null,
    },
  })
  if (existing) {
    await db.$transaction(async (tx) => {
      if (qualityTier === "PREMIUM") {
        await tx.chapterRelease.updateMany({
          where: {
            id: { not: existing.id },
            sourceId: source.id,
            targetLanguage: "tr",
            isActive: true,
            deletedAt: null,
          },
          data: {
            status: "ARCHIVED",
            isActive: false,
            isPublic: false,
            isIndexable: false,
          },
        })
      } else if (
        await tx.chapterRelease.findFirst({
          where: {
            id: { not: existing.id },
            sourceId: source.id,
            targetLanguage: "tr",
            qualityTier: "PREMIUM",
            isActive: true,
            isPublic: true,
            deletedAt: null,
          },
          select: { id: true },
        })
      ) {
        throw new Error(
          "Bu kaynak için Premium sürüm etkin; Dengeli indirme yayınlanamaz.",
        )
      }
      await tx.chapterRelease.update({
        where: { id: existing.id },
        data: {
          status: "PUBLISHED",
          isPublic: true,
          isActive: true,
          publishedAt: existing.publishedAt ?? new Date(),
        },
      })
    })
    return existing.id
  }

  const archive = new Uint8Array(
    await readFile(
      safeMandownDownloadPath(input.downloadRoot, input.archivePath),
    ),
  )
  const images = parseCbz(archive)
  const releaseId = randomUUID()
  const storagePrefix = `chapters/${chapter.id}/releases/${releaseId}`
  const stored: string[] = []
  try {
    const pages: Array<{
      pageNumber: number
      storageKey: string
      width: number
      height: number
      mimeType: string
      fileSize: bigint
      checksum: string
    }> = []
    for (const [index, image] of images.entries()) {
      const storageKey = `${storagePrefix}/${String(index + 1).padStart(4, "0")}.${image.extension}`
      await getStorage().put(storageKey, image.body, {
        contentType: image.mimeType,
      })
      stored.push(storageKey)
      pages.push({
        pageNumber: index + 1,
        storageKey,
        width: image.width,
        height: image.height,
        mimeType: image.mimeType,
        fileSize: BigInt(image.body.length),
        checksum: checksum(image.body),
      })
    }
    const latestRevision = await db.chapterRelease.aggregate({
      where: {
        chapterId: chapter.id,
        sourceId: source.id,
        targetLanguage: "tr",
        translationProfileId: profile.id,
      },
      _max: { revision: true },
    })
    await db.$transaction(async (tx) => {
      if (qualityTier === "PREMIUM") {
        await tx.chapterRelease.updateMany({
          where: {
            sourceId: source.id,
            targetLanguage: "tr",
            isActive: true,
            deletedAt: null,
          },
          data: {
            status: "ARCHIVED",
            isActive: false,
            isPublic: false,
            isIndexable: false,
          },
        })
      } else if (
        await tx.chapterRelease.findFirst({
          where: {
            sourceId: source.id,
            targetLanguage: "tr",
            qualityTier: "PREMIUM",
            isActive: true,
            isPublic: true,
            deletedAt: null,
          },
          select: { id: true },
        })
      ) {
        throw new Error(
          "Bu kaynak için Premium sürüm etkin; Dengeli indirme yayınlanamaz.",
        )
      }
      await tx.chapterRelease.create({
        data: {
          id: releaseId,
          chapterId: chapter.id,
          sourceId: source.id,
          targetLanguage: "tr",
          sourceLanguage: input.payload.sourceLanguage,
          translationProfileId: profile.id,
          qualityTier,
          pipelineVersion: input.payload.pipelineVersion,
          revision: (latestRevision._max.revision ?? 0) + 1,
          storagePrefix,
          pageCount: pages.length,
          status: "PUBLISHED",
          publishedAt: new Date(),
          isPublic: true,
          isActive: true,
          isIndexable: false,
          pages: { create: pages },
        },
      })
      await tx.platformChapter.update({
        where: { id: chapter.id },
        data: { thumbnailStorageKey: pages[0]?.storageKey },
      })
      await tx.contentRevision.create({
        data: {
          entityType: "RELEASE",
          entityId: releaseId,
          action: "PUBLISH",
          actorId: input.actorId,
          after: {
            source: "MANDOWN_DOWNLOAD",
            pageCount: pages.length,
            pipelineVersion: input.payload.pipelineVersion,
          },
        },
      })
    })
    return releaseId
  } catch (error) {
    await Promise.allSettled(stored.map((key) => getStorage().delete(key)))
    throw error
  }
}

export async function processMandownTranslationJob(
  jobId: string,
  options: { retryProcessing?: boolean } = {},
) {
  const claimed = await db.translationJob.updateMany({
    where: {
      id: jobId,
      status: {
        in: options.retryProcessing
          ? ["QUEUED", "PROCESSING", "FAILED"]
          : ["QUEUED", "FAILED"],
      },
    },
    data: { status: "PROCESSING", failureReason: null },
  })
  if (!claimed.count) {
    const existing = await db.translationJob.findUniqueOrThrow({
      where: { id: jobId },
      select: { status: true },
    })
    if (existing.status === "COMPLETED") return
    throw new Error(`Mandown işi işlenemiyor: ${existing.status}`)
  }
  await db.translationCampaign.update({
    where: { translationJobId: jobId },
    data: { status: "PROCESSING" },
  })
  await db.$transaction((tx) => updateBatchItemForJob(tx, jobId, "PROCESSING"))

  const job = await db.translationJob.findUniqueOrThrow({
    where: { id: jobId },
    include: {
      campaign: {
        include: {
          chapters: true,
          contributions: {
            where: { status: "COMMITTED" },
            select: {
              id: true,
              userId: true,
              credits: true,
              refundedCredits: true,
            },
          },
        },
      },
    },
  })
  const payload = job.payload as unknown as TranslationJobPayload
  try {
    const downloadRoot = path.resolve(
      process.env.MANDOWN_DOWNLOAD_ROOT ?? "storage/mandown",
    )
    const series = await canonicalSeries(payload.catalogSeriesId)
    const catalog = await db.catalogSeries.findUniqueOrThrow({
      where: { id: payload.catalogSeriesId, isActive: true },
      select: { coverPath: true },
    })
    const edition = await db.catalogSourceEdition.findUniqueOrThrow({
      where: { id: payload.sourceEditionId, isActive: true },
      select: {
        backendPlatform: true,
        publicDescription: true,
        publicSourceLabel: true,
        sourceUrl: true,
      },
    })
    if (
      edition.backendPlatform !== "NAVER" &&
      edition.backendPlatform !== "WEBTOONS" &&
      edition.backendPlatform !== "OTHER"
    ) {
      throw new Error("Mandown kaynak platformu desteklenmiyor.")
    }
    const catalogChapters = await db.catalogSourceChapter.findMany({
      where: {
        sourceEditionId: payload.sourceEditionId,
        id: {
          in: job.campaign.chapters
            .filter((item) => item.status === "PENDING")
            .map((item) => item.sourceChapterId),
        },
      },
      orderBy: { sortKey: "asc" },
    })
    const existingChapters = await db.platformChapter.findMany({
      where: {
        seriesId: series.id,
        chapterNumber: {
          in: catalogChapters.map((chapter) => chapter.chapterNumber),
        },
      },
      select: { chapterNumber: true },
    })
    const missingChapters = filterMissingCatalogChapters(
      catalogChapters,
      existingChapters.map((chapter) => chapter.chapterNumber),
    )
    const download = missingChapters.length
      ? await runMandownTranslationDownload({
          ...payload,
          externalChapterIds: missingChapters.map(
            (chapter) => chapter.externalChapterId,
          ),
        })
      : null

    if (!series.coverStorageKey) {
      const coverBody = download?.coverPath
        ? new Uint8Array(
            await readFile(
              safeMandownDownloadPath(downloadRoot, download.coverPath),
            ),
          )
        : catalog.coverPath
          ? await downloadImage(catalog.coverPath)
          : null
      if (coverBody) {
        const cover = parseImage(coverBody)
        const coverStorageKey = `covers/series/${series.id}/mandown.${cover.extension}`
        await getStorage().put(coverStorageKey, cover.body, {
          contentType: cover.mimeType,
        })
        await db.series.update({
          where: { id: series.id },
          data: { coverStorageKey },
        })
      }
    }

    if (download && download.archives.length !== missingChapters.length) {
      throw new Error("Mandown indirmesi tüm eksik bölümleri döndürmedi.")
    }
    const chapterByNumber = new Map(
      missingChapters.map((chapter) => [chapter.chapterNumber, chapter]),
    )
    const releaseIds: string[] = []
    const skippedChapterNumbers = existingChapters.map(
      (chapter) => chapter.chapterNumber,
    )
    for (const archive of download?.archives ?? []) {
      const catalogChapter = chapterByNumber.get(archive.chapterNumber)
      if (!catalogChapter) {
        throw new Error(
          `İndirilen ${archive.chapterNumber} numaralı bölüm katalogda bulunamadı.`,
        )
      }
      const stillOwned = await db.translationCampaignChapter.findUnique({
        where: {
          campaignId_sourceChapterId: {
            campaignId: job.campaignId,
            sourceChapterId: catalogChapter.id,
          },
        },
        select: { status: true },
      })
      if (stillOwned?.status !== "PENDING") {
        skippedChapterNumbers.push(catalogChapter.chapterNumber)
        continue
      }
      const releaseId = await importArchive({
        actorId: job.campaign.createdById,
        archivePath: archive.path,
        catalogChapter,
        downloadRoot,
        payload,
        seriesId: series.id,
        source: {
          backendPlatform: edition.backendPlatform,
          publicDescription: edition.publicDescription,
          publicSourceLabel: edition.publicSourceLabel,
          sourceUrl: edition.sourceUrl,
        },
      })
      if (releaseId) releaseIds.push(releaseId)
      else skippedChapterNumbers.push(catalogChapter.chapterNumber)
    }

    const now = new Date()
    await db.$transaction(async (tx) => {
      const externalJobsStillRunning =
        await tx.translationCampaignChapter.count({
          where: {
            campaignId: job.campaignId,
            status: "COMPLETED_EXTERNALLY",
            externalTranslationJob: {
              status: { not: "COMPLETED" },
            },
          },
        })
      await tx.translationJob.update({
        where: { id: job.id },
        data: {
          status: "COMPLETED",
          completedAt: now,
          payload: {
            ...(job.payload as object),
            mandownDownload: download,
            releaseIds,
            skippedChapterNumbers,
          },
        },
      })
      await tx.translationCampaign.update({
        where: { id: job.campaignId },
        data: {
          status: externalJobsStillRunning ? "PROCESSING" : "COMPLETED",
          completedAt: externalJobsStillRunning ? null : now,
          publicAt: externalJobsStillRunning ? null : now,
          chapters: {
            updateMany: {
              where: { status: "PENDING" },
              data: {
                status: "COMPLETED",
                completedAt: now,
                activeKey: null,
              },
            },
          },
        },
      })
      await updateBatchItemForJob(tx, job.id, "COMPLETED", now)
      const externallyCompletedItems =
        await tx.translationCampaignChapter.findMany({
          where: { externalTranslationJobId: job.id },
          select: { campaignId: true },
        })
      for (const campaignId of new Set(
        externallyCompletedItems.map((item) => item.campaignId),
      )) {
        const pendingCount = await tx.translationCampaignChapter.count({
          where: { campaignId, status: "PENDING" },
        })
        if (!pendingCount) {
          await tx.translationCampaign.update({
            where: { id: campaignId },
            data: {
              status: "COMPLETED",
              completedAt: now,
              publicAt: now,
            },
          })
        }
      }
      await tx.translationEarlyAccessGrant.updateMany({
        where: { translationJobId: job.id },
        data: {
          expiresAt: new Date(
            now.getTime() +
              translationConfig.earlyAccessHours * 60 * 60 * 1_000,
          ),
        },
      })
      for (const userId of translationFollowerIds(
        job.campaign.createdById,
        job.campaign.contributions.map((item) => item.userId),
      )) {
        await tx.seriesFollow.upsert({
          where: {
            userId_seriesId: { userId, seriesId: series.id },
          },
          create: {
            userId,
            seriesId: series.id,
            lastSeenReleaseAt: now,
          },
          update: {},
        })
        await tx.siteNotification.upsert({
          where: { dedupeKey: `translation-job:${job.id}:COMPLETED:${userId}` },
          create: {
            userId,
            type: "TRANSLATION_CAMPAIGN",
            title: releaseIds.length ? "Bölümler indirildi" : "Bölümler mevcut",
            message:
              releaseIds.length > 0
                ? `${releaseIds.length} eksik bölüm Mandown ile indirilip okuyucuya eklendi.`
                : "Seçilen bölümler sitede zaten bulunduğu için yeniden eklenmedi.",
            href: "/translate/serilerim",
            dedupeKey: `translation-job:${job.id}:COMPLETED:${userId}`,
          },
          update: {},
        })
      }
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Mandown indirmesi başarısız."
    const communityRetryJobIds = await db.$transaction(async (tx) => {
      const retryJobIds: string[] = []
      const linkedItems = await tx.translationCampaignChapter.findMany({
        where: { externalTranslationJobId: job.id },
        select: {
          campaignId: true,
          sourceChapterId: true,
          allocatedCredits: true,
          externalPreviousActiveKey: true,
          externalPreviousCampaignStatus: true,
        },
      })
      await tx.translationJob.update({
        where: { id: job.id },
        data: { status: "FAILED", failureReason: message },
      })
      await tx.translationCampaign.update({
        where: { id: job.campaignId },
        data: {
          status: "FAILED",
          ...(["INSTANT", "BATCH_INSTANT"].includes(job.campaign.kind)
            ? { fundedCredits: 0 }
            : {}),
          chapters: {
            updateMany: { where: {}, data: { activeKey: null } },
          },
        },
      })
      await updateBatchItemForJob(tx, job.id, "FAILED", new Date())
      if (
        job.campaign.kind === "INSTANT" ||
        job.campaign.kind === "BATCH_INSTANT"
      ) {
        for (const contribution of job.campaign.contributions) {
          const refundable = contribution.credits - contribution.refundedCredits
          if (refundable <= 0) continue
          await tx.translationContribution.update({
            where: { id: contribution.id },
            data: {
              refundedCredits: contribution.credits,
              status: "REFUNDED",
              refundedAt: new Date(),
            },
          })
          await tx.creditAccount.upsert({
            where: { userId: contribution.userId },
            create: {
              userId: contribution.userId,
              cachedBalance: refundable,
            },
            update: { cachedBalance: { increment: refundable } },
          })
          await tx.creditTransaction.create({
            data: {
              userId: contribution.userId,
              amount: refundable,
              type: "CONTRIBUTION_REFUND",
              referenceType:
                job.campaign.kind === "BATCH_INSTANT"
                  ? "batch_instant_translation_refund"
                  : "instant_translation",
              referenceId: job.id,
              idempotencyKey: `translation-job:${job.id}:failure-refund:${contribution.userId}`,
              metadata: {
                reason:
                  job.campaign.kind === "BATCH_INSTANT"
                    ? "batch_instant_translation_item_failed"
                    : "instant_translation_failed",
              },
            },
          })
        }
      }
      await tx.translationEarlyAccessGrant.deleteMany({
        where: { translationJobId: job.id },
      })
      for (const linked of linkedItems) {
        await tx.translationCampaignChapter.update({
          where: {
            campaignId_sourceChapterId: {
              campaignId: linked.campaignId,
              sourceChapterId: linked.sourceChapterId,
            },
          },
          data: {
            status: "PENDING",
            completedAt: null,
            activeKey: linked.externalPreviousActiveKey,
            externalTranslationJobId: null,
            externalPreviousActiveKey: null,
            externalPreviousCampaignStatus: null,
          },
        })
      }
      for (const campaignId of new Set(
        linkedItems.map((item) => item.campaignId),
      )) {
        const restoredCredits = linkedItems
          .filter((item) => item.campaignId === campaignId)
          .reduce((sum, item) => sum + item.allocatedCredits, 0)
        const currentCampaign = await tx.translationCampaign.findUniqueOrThrow({
          where: { id: campaignId },
          select: { targetCredits: true, fundedCredits: true },
        })
        const restored = restorePackageAfterInstantFailure({
          adjustedTargetCredits: currentCampaign.targetCredits,
          fundedCredits: currentCampaign.fundedCredits,
          allocatedCredits: restoredCredits,
        })
        const campaign = await tx.translationCampaign.update({
          where: { id: campaignId },
          data: { targetCredits: restored.targetCredits },
        })
        const packageJob = await tx.translationJob.findUnique({
          where: { campaignId },
          select: { id: true, status: true },
        })
        if (
          packageJob?.status === "COMPLETED" ||
          packageJob?.status === "FAILED"
        ) {
          await tx.translationJob.update({
            where: { id: packageJob.id },
            data: {
              status: "QUEUED",
              completedAt: null,
              failureReason: null,
            },
          })
          retryJobIds.push(packageJob.id)
        }
        await tx.translationCampaign.update({
          where: { id: campaignId },
          data: {
            status:
              packageJob?.status === "PROCESSING"
                ? "PROCESSING"
                : packageJob
                  ? "QUEUED"
                  : campaign.fundedCredits >= campaign.targetCredits
                    ? "FUNDED"
                    : "FUNDING",
            ...(campaign.fundedCredits < campaign.targetCredits
              ? { fundedAt: null }
              : {}),
          },
        })
      }
      return retryJobIds
    })
    if (communityRetryJobIds.length) {
      await Promise.allSettled(
        communityRetryJobIds.map((retryJobId) =>
          processMandownTranslationJob(retryJobId),
        ),
      )
    }
    throw error
  }
}
