import { createHash, randomUUID } from "node:crypto"
import path from "node:path"
import { db, type Languages, type Prisma } from "@taiyomoe/db"
import { mandownDownload } from "./mandown-bridge"
import type { TranslationQuality } from "./types"

export type MandownBackendPlatform = "NAVER" | "WEBTOONS" | "OTHER"

export interface TranslationJobPayload {
  canonicalSeriesId?: string
  catalogSeriesId: string
  sourceEditionId: string
  externalChapterIds: string[]
  backendPlatform: MandownBackendPlatform
  sourceLanguage: Languages
  outputLanguage: "tr"
  qualityTier: TranslationQuality
  pipelineVersion: string
  callbackUrl: string
  idempotencyKey: string
}

export interface TranslationJobDispatcher {
  enqueueTranslation(payload: TranslationJobPayload): Promise<{
    provider: string
    payload: TranslationJobPayload
  }>
}

export function jsonSafeTranslationJobPayload(
  payload: TranslationJobPayload,
): TranslationJobPayload {
  const { canonicalSeriesId, ...required } = payload
  return {
    ...required,
    ...(canonicalSeriesId ? { canonicalSeriesId } : {}),
  }
}

export async function backendPlatformForEdition(sourceEditionId: string) {
  const edition = await db.catalogSourceEdition.findUnique({
    where: { id: sourceEditionId, isActive: true },
    select: { backendPlatform: true },
  })
  if (
    edition?.backendPlatform !== "NAVER" &&
    edition?.backendPlatform !== "WEBTOONS" &&
    edition?.backendPlatform !== "OTHER"
  )
    throw new Error("Desteklenmeyen Mandown kaynak platformu.")
  return edition.backendPlatform
}

export class MandownTranslationJobDispatcher
  implements TranslationJobDispatcher
{
  async enqueueTranslation(payload: TranslationJobPayload) {
    return {
      provider: "mandown",
      payload: jsonSafeTranslationJobPayload(payload),
    }
  }
}

export async function runMandownTranslationDownload(
  payload: TranslationJobPayload,
) {
  const edition = await db.catalogSourceEdition.findUnique({
    where: { id: payload.sourceEditionId, isActive: true },
    select: { sourceUrl: true },
  })
  if (!edition?.sourceUrl) throw new Error("Mandown kaynak URL’si bulunamadı.")
  const chapters = await db.catalogSourceChapter.findMany({
    where: {
      sourceEditionId: payload.sourceEditionId,
      externalChapterId: { in: payload.externalChapterIds },
      isAvailable: true,
    },
    orderBy: { sortKey: "asc" },
    select: { chapterNumber: true },
  })
  if (chapters.length !== payload.externalChapterIds.length)
    throw new Error("İndirilecek bölüm eşlemesi eksik.")
  const downloadRoot = path.resolve(
    process.env.MANDOWN_DOWNLOAD_ROOT ?? "storage/mandown",
  )
  const folder = createHash("sha256")
    .update(payload.idempotencyKey)
    .digest("hex")
    .slice(0, 24)
  return mandownDownload({
    url: edition.sourceUrl,
    chapterNumbers: chapters.map((chapter) => chapter.chapterNumber),
    destination: path.join(downloadRoot, folder),
    downloadRoot,
  })
}

export function getTranslationJobDispatcher(): TranslationJobDispatcher {
  return new MandownTranslationJobDispatcher()
}

export async function queueTranslationCampaignJob(
  tx: Prisma.TransactionClient,
  campaignId: string,
) {
  const campaign = await tx.translationCampaign.findUniqueOrThrow({
    where: { id: campaignId },
    include: {
      chapters: {
        where: { status: "PENDING" },
        select: { sourceChapterId: true },
      },
    },
  })
  const existing = await tx.translationJob.findUnique({
    where: { campaignId },
    select: { id: true },
  })
  if (existing || !campaign.chapters.length) return existing?.id
  const [catalog, edition, chapters] = await Promise.all([
    tx.catalogSeries.findUniqueOrThrow({
      where: { id: campaign.catalogSeriesId },
      select: { canonicalSeriesId: true },
    }),
    tx.catalogSourceEdition.findUniqueOrThrow({
      where: { id: campaign.sourceEditionId },
      select: { backendPlatform: true, sourceLanguage: true },
    }),
    tx.catalogSourceChapter.findMany({
      where: {
        id: {
          in: campaign.chapters.map((chapter) => chapter.sourceChapterId),
        },
      },
      orderBy: { sortKey: "asc" },
      select: { externalChapterId: true },
    }),
  ])
  if (
    edition.backendPlatform !== "NAVER" &&
    edition.backendPlatform !== "WEBTOONS" &&
    edition.backendPlatform !== "OTHER"
  )
    throw new Error("Desteklenmeyen Mandown kaynak platformu.")
  const jobId = randomUUID()
  const qualityTier: TranslationQuality =
    campaign.qualityTier === "PREMIUM" ? "premium" : "balanced"
  const idempotencyKey = `translation-job:${campaign.id}`
  const jobInput = await getTranslationJobDispatcher().enqueueTranslation({
    canonicalSeriesId: catalog.canonicalSeriesId ?? undefined,
    catalogSeriesId: campaign.catalogSeriesId,
    sourceEditionId: campaign.sourceEditionId,
    externalChapterIds: chapters.map((chapter) => chapter.externalChapterId),
    backendPlatform: edition.backendPlatform,
    sourceLanguage: edition.sourceLanguage,
    outputLanguage: "tr",
    qualityTier,
    pipelineVersion: "mandown-1.12.2",
    callbackUrl: `/api/translation/jobs/${jobId}/callback`,
    idempotencyKey,
  })
  await tx.translationJob.create({
    data: {
      id: jobId,
      campaignId,
      provider: jobInput.provider,
      payload: jobInput.payload,
      idempotencyKey,
    },
  })
  await tx.translationCampaign.update({
    where: { id: campaignId },
    data: { status: "QUEUED", translationJobId: jobId },
  })
  return jobId
}
