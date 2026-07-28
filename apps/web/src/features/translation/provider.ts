import {
  createHash,
  createHmac,
  randomUUID,
  timingSafeEqual,
} from "node:crypto"
import { db, Languages, type Prisma } from "@taiyomoe/db"
import { z } from "zod"
import {
  isUnavailableNaverMirrorError,
  type MandownMangaDetailsOutput,
  type MandownSourceDetailsOutput,
  type MandownSourceProvider,
  mandownSearch,
  mandownSourceDetails,
} from "./mandown-bridge"
import type {
  AniListCatalogSearchItem,
  CatalogChapter,
  CatalogSourceProvider,
  PublicCatalogSeries,
  PublicSourceEdition,
  SourceCatalogProvider,
} from "./types"

const providerConfig = {
  webtoons: {
    backendPlatform: "WEBTOONS" as const,
    label: "WEBTOON",
    priority: 100,
  },
  mangadex: {
    backendPlatform: "OTHER" as const,
    label: "MangaDex",
    priority: 90,
  },
  naver: {
    backendPlatform: "NAVER" as const,
    label: "Naver Webtoon",
    priority: 80,
  },
  naver_series: {
    backendPlatform: "NAVER" as const,
    label: "Naver Series",
    priority: 70,
  },
} satisfies Record<
  CatalogSourceProvider,
  {
    backendPlatform: "WEBTOONS" | "OTHER" | "NAVER"
    label: string
    priority: number
  }
>

const languageCodes = new Set<string>(Object.values(Languages))
const englishLanguageNames = new Intl.DisplayNames(["en"], { type: "language" })
const turkishLanguageNames = new Intl.DisplayNames(["tr"], { type: "language" })

const selectionSourceSchema = z.object({
  provider: z.enum(["mangadex", "webtoons", "naver", "naver_series"]),
  url: z.url(),
  language: z.enum(Languages),
  site: z.string(),
  type: z.string().nullable(),
  is_disabled: z.boolean(),
})
const selectionMangaSchema = z.object({
  id: z.number().int().positive(),
  id_mal: z.number().int().positive().nullable(),
  title: z.object({
    romaji: z.string().nullable(),
    english: z.string().nullable(),
    native: z.string().nullable(),
  }),
  synonyms: z.array(z.string()),
  format: z.string().nullable(),
  status: z.string().nullable(),
  country_of_origin: z.string().nullable(),
  popularity: z.number().int().nullable(),
  average_score: z.number().int().nullable(),
  cover_image: z
    .object({
      extra_large: z.string().nullable(),
      large: z.string().nullable(),
      medium: z.string().nullable(),
      color: z.string().nullable(),
    })
    .nullable(),
  site_url: z.string().nullable(),
  description: z.string().nullable(),
  chapters: z.number().int().nullable(),
  volumes: z.number().int().nullable(),
  genres: z.array(z.string()),
  external_links: z.array(
    z.object({
      site: z.string(),
      url: z.string(),
      type: z.string().nullable(),
      language: z.string().nullable(),
      is_disabled: z.boolean().nullable(),
      notes: z.string().nullable(),
    }),
  ),
})
const selectionPayloadSchema = z.object({
  version: z.literal(1),
  manga: selectionMangaSchema,
  sources: z.array(selectionSourceSchema),
})
type SelectionPayload = z.infer<typeof selectionPayloadSchema>

export function normalizeCatalogQuery(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .normalize("NFC")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

function normalizedLanguageName(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("en")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
}

const languageNameToCode = new Map<string, Languages>(
  Object.values(Languages).flatMap((code) => {
    const localeCode = code.replace("_", "-")
    const values = [
      code,
      localeCode,
      englishLanguageNames.of(localeCode),
      turkishLanguageNames.of(localeCode),
    ].filter((value): value is string => Boolean(value))
    return values.map((value) => [normalizedLanguageName(value), code] as const)
  }),
)

function languageFromUrl(url: string) {
  try {
    const parsed = new URL(url)
    if (
      parsed.hostname === "comic.naver.com" ||
      parsed.hostname === "m.comic.naver.com" ||
      parsed.hostname === "series.naver.com" ||
      parsed.hostname === "m.series.naver.com"
    )
      return Languages.ko
    if (parsed.hostname === "mangadex.org") return Languages.en
    if (parsed.hostname === "www.webtoons.com") {
      const locale = parsed.pathname.split("/").filter(Boolean)[0]
      if (locale) {
        const normalized = locale.replace("-", "_").toLocaleLowerCase("en")
        if (languageCodes.has(normalized)) return normalized as Languages
        if (normalized === "zh_hant") return Languages.zh_hk
      }
    }
  } catch {
    return null
  }
  return null
}

export function normalizeSourceLanguage(language: string | null, url: string) {
  if (language) {
    const matched = languageNameToCode.get(normalizedLanguageName(language))
    if (matched) return matched
  }
  return languageFromUrl(url)
}

function sourceLanguageLabel(language: string) {
  return (
    turkishLanguageNames.of(language.replace("_", "-")) ??
    language.toLocaleUpperCase("tr")
  )
}

function externalKey(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

function selectionSecret() {
  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret) throw new Error("AniList seçim imzası yapılandırılmamış.")
  return secret
}

function signSelection(payload: SelectionPayload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const signature = createHmac("sha256", selectionSecret())
    .update(encoded)
    .digest("base64url")
  return `${encoded}.${signature}`
}

function verifySelection(token: string): SelectionPayload {
  const [encoded, signature, extra] = token.split(".")
  if (!encoded || !signature || extra)
    throw new Error("Geçersiz AniList seçim bilgisi.")
  const expected = createHmac("sha256", selectionSecret())
    .update(encoded)
    .digest()
  let received: Buffer
  try {
    received = Buffer.from(signature, "base64url")
  } catch {
    throw new Error("Geçersiz AniList seçim bilgisi.")
  }
  if (
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  )
    throw new Error("AniList seçim bilgisi doğrulanamadı.")
  try {
    return selectionPayloadSchema.parse(
      JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")),
    )
  } catch {
    throw new Error("AniList seçim bilgisi okunamadı.")
  }
}

function sourceProviderFromUrl(
  value: string | null,
): MandownSourceProvider | null {
  if (!value) return null
  try {
    const hostname = new URL(value).hostname.toLocaleLowerCase("en")
    if (hostname === "mangadex.org" || hostname.endsWith(".mangadex.org"))
      return "mangadex"
    if (hostname === "webtoons.com" || hostname.endsWith(".webtoons.com"))
      return "webtoons"
    if (hostname === "series.naver.com" || hostname === "m.series.naver.com")
      return "naver_series"
    if (hostname === "comic.naver.com" || hostname === "m.comic.naver.com")
      return "naver"
  } catch {
    return null
  }
  return null
}

function validatedSourceUrl(
  provider: MandownSourceProvider,
  value: string | null,
) {
  if (!value || sourceProviderFromUrl(value) !== provider) return null
  try {
    const url = new URL(value)
    if (url.protocol !== "http:" && url.protocol !== "https:") return null
    url.protocol = "https:"
    return url.toString()
  } catch {
    return null
  }
}

type ResolvedSource = SelectionPayload["sources"][number]

export function preferPrimarySourceLanguages(
  sources: ResolvedSource[],
): ResolvedSource[] {
  const hasEnglishOrKorean = sources.some(
    (source) =>
      source.language === Languages.en || source.language === Languages.ko,
  )
  if (!hasEnglishOrKorean) return sources
  return sources.filter(
    (source) =>
      source.language === Languages.en || source.language === Languages.ko,
  )
}

function resolvedSources(details: MandownMangaDetailsOutput) {
  const sources = details.sources.flatMap((source) => {
    if (source.is_disabled) return []
    const url = validatedSourceUrl(source.provider, source.url)
    const language = normalizeSourceLanguage(source.language, source.url)
    return url && language ? [{ ...source, url, language }] : []
  })
  return preferPrimarySourceLanguages(sources)
}

function titleValues(manga: MandownMangaDetailsOutput["manga"]) {
  return [
    manga.title.english,
    manga.title.romaji,
    manga.title.native,
    ...manga.synonyms,
  ].filter(
    (value, index, values): value is string =>
      typeof value === "string" &&
      Boolean(value.trim()) &&
      values.indexOf(value) === index,
  )
}

function publicationStatus(status: string | null) {
  if (status === "FINISHED" || status === "CANCELLED")
    return "COMPLETED" as const
  if (status === "HIATUS") return "HIATUS" as const
  return "ONGOING" as const
}

function publicPublicationStatus(status: string) {
  if (status === "COMPLETED") return "completed" as const
  if (status === "HIATUS") return "hiatus" as const
  return "ongoing" as const
}

function cleanDescription(value: string | null) {
  return (
    value
      ?.replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim() ?? ""
  )
}

function anonymousSourceLabel(language: string, ordinal = 1) {
  return `${sourceLanguageLabel(language)}-${ordinal}`
}

function sourceDescription(language: string) {
  if (language === Languages.ko)
    return "Standart korece kaynak, genelde daha fazla bölüm bulunur. Çevirimi ingilizceye göre biraz daha pahalıdır."
  if (language === Languages.en)
    return "Standart ingilizce kaynak, genelde koreceden çevrilmiş kaliteli seriler bulunur. Çevirimi daha ucuz ve kalitelidir."
  return `Standart ${sourceLanguageLabel(language)} kaynak.`
}

function publicEdition(
  edition: {
    id: string
    sourceUrl: string | null
    sourceLanguage: Languages
    publicSourceLabel: string
    publicDescription: string
    priority: number
    lastUpdatedAt: Date | null
  },
  chapters: CatalogChapter[] = [],
  chaptersLoaded = false,
  publicLabel = edition.publicSourceLabel,
): PublicSourceEdition | null {
  const provider = sourceProviderFromUrl(edition.sourceUrl)
  if (!provider) return null
  return {
    id: edition.id,
    publicSourceLabel: publicLabel,
    sourceLanguage: edition.sourceLanguage,
    sourceLanguageLabel: sourceLanguageLabel(edition.sourceLanguage),
    provider,
    providerLabel: publicLabel,
    description: sourceDescription(edition.sourceLanguage),
    chapterCount: chapters.length,
    lastChapterNumber: chapters.at(-1)?.number ?? "—",
    lastUpdatedAt: edition.lastUpdatedAt?.toISOString(),
    priority: edition.priority,
    chaptersLoaded,
    chapters,
  }
}

export async function syncCatalogSourceChapters(
  tx: Prisma.TransactionClient,
  sourceEditionId: string,
  chapters: MandownSourceDetailsOutput["chapters"],
): Promise<CatalogChapter[]> {
  const existing = await tx.catalogSourceChapter.findMany({
    where: { sourceEditionId },
  })
  const byNumber = new Map(
    existing.map((chapter) => [chapter.chapterNumber, chapter]),
  )
  const byExternalId = new Map(
    existing.map((chapter) => [chapter.externalChapterId, chapter]),
  )
  const seenNumbers = new Set<string>()
  const seenExternalIds = new Set<string>()
  const synchronized: CatalogChapter[] = []

  for (const [index, chapter] of chapters.entries()) {
    const chapterNumber = (chapter.chapterNumber || String(index + 1)).trim()
    if (!chapterNumber || seenNumbers.has(chapterNumber)) continue

    const externalChapterId = externalKey(chapter.url || chapter.slug)
    if (seenExternalIds.has(externalChapterId)) continue
    seenNumbers.add(chapterNumber)
    seenExternalIds.add(externalChapterId)
    const existingChapter =
      byNumber.get(chapterNumber) ?? byExternalId.get(externalChapterId)
    synchronized.push({
      id: existingChapter?.id ?? randomUUID(),
      externalChapterId:
        existingChapter?.externalChapterId ?? externalChapterId,
      number: chapterNumber,
      sortKey: index + 1,
      title: chapter.title || undefined,
      publishedAt: existingChapter?.publishedAt?.toISOString(),
    })
  }

  if (synchronized.length) {
    const rows = synchronized.map((chapter) => ({
      id: chapter.id,
      sourceEditionId,
      externalChapterId: chapter.externalChapterId,
      chapterNumber: chapter.number,
      sortKey: chapter.sortKey,
      title: chapter.title ?? null,
      publishedAt: chapter.publishedAt ?? null,
    }))
    await tx.$executeRaw`
      WITH incoming AS (
        SELECT *
        FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS row(
          "id" uuid,
          "sourceEditionId" uuid,
          "externalChapterId" text,
          "chapterNumber" text,
          "sortKey" integer,
          "title" text,
          "publishedAt" timestamp(3)
        )
      )
      INSERT INTO "CatalogSourceChapter" (
        "id",
        "sourceEditionId",
        "externalChapterId",
        "chapterNumber",
        "sortKey",
        "title",
        "publishedAt",
        "isAvailable",
        "updatedAt"
      )
      SELECT
        "id",
        "sourceEditionId",
        "externalChapterId",
        "chapterNumber",
        "sortKey",
        "title",
        "publishedAt",
        true,
        CURRENT_TIMESTAMP
      FROM incoming
      ON CONFLICT ("id") DO UPDATE SET
        "chapterNumber" = EXCLUDED."chapterNumber",
        "sortKey" = EXCLUDED."sortKey",
        "title" = EXCLUDED."title",
        "isAvailable" = true,
        "updatedAt" = CURRENT_TIMESTAMP
    `
  }

  await tx.$executeRaw`
    UPDATE "CatalogSourceChapter" AS chapter
    SET
      "isAvailable" = false,
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE
      chapter."sourceEditionId" = ${sourceEditionId}::uuid
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(
          ${JSON.stringify([...seenNumbers])}::jsonb
        ) AS active("chapterNumber")
        WHERE active."chapterNumber" = chapter."chapterNumber"
      )
  `

  return synchronized
}

export class MandownSourceCatalogProvider implements SourceCatalogProvider {
  async searchSeries(query: string): Promise<AniListCatalogSearchItem[]> {
    if (!normalizeCatalogQuery(query)) return []
    const { items } = await mandownSearch(query)
    return items.map((details) => {
      const item = details.manga
      const sources = resolvedSources(details)
      return {
        anilistId: item.id,
        selectionToken: signSelection({
          version: 1,
          manga: item,
          sources,
        }),
        title: item.title,
        synonyms: item.synonyms,
        cover:
          item.cover_image?.extra_large ??
          item.cover_image?.large ??
          item.cover_image?.medium ??
          null,
        publicationStatus: item.status,
        format: item.format,
      }
    })
  }

  async selectSeries(selectionToken: string) {
    const { manga, sources } = verifySelection(selectionToken)
    const titles = titleValues(manga)
    const title =
      manga.title.english ??
      manga.title.romaji ??
      manga.title.native ??
      `AniList #${manga.id}`
    const originalTitle = manga.title.native ?? manga.title.romaji ?? title
    const externalIds = sources.map((source) =>
      externalKey(`${source.provider}:${source.language}:${source.url}`),
    )

    const series = await db.$transaction(async (tx) => {
      const saved = await tx.catalogSeries.upsert({
        where: {
          providerKey_externalSeriesId: {
            providerKey: "mandown:anilist",
            externalSeriesId: String(manga.id),
          },
        },
        create: {
          providerKey: "mandown:anilist",
          externalSeriesId: String(manga.id),
          canonicalKey: `mandown-anilist-${manga.id}`,
          title,
          originalTitle,
          alternativeTitles: titles.filter((value) => value !== title),
          description:
            cleanDescription(manga.description) ||
            "AniList seri ayrıntıları ve desteklenen kaynaklar.",
          coverPath:
            manga.cover_image?.extra_large ??
            manga.cover_image?.large ??
            manga.cover_image?.medium ??
            "/placeholders/series-cover.svg",
          publicationStatus: publicationStatus(manga.status),
          isActive: true,
        },
        update: {
          title,
          originalTitle,
          alternativeTitles: titles.filter((value) => value !== title),
          description:
            cleanDescription(manga.description) ||
            "AniList seri ayrıntıları ve desteklenen kaynaklar.",
          ...(manga.cover_image?.extra_large ||
          manga.cover_image?.large ||
          manga.cover_image?.medium
            ? {
                coverPath:
                  manga.cover_image.extra_large ??
                  manga.cover_image.large ??
                  manga.cover_image.medium!,
              }
            : {}),
          publicationStatus: publicationStatus(manga.status),
          isActive: true,
          updatedAt: new Date(),
        },
      })

      await tx.catalogSourceEdition.updateMany({
        where: {
          catalogSeriesId: saved.id,
          ...(externalIds.length
            ? { externalEditionId: { notIn: externalIds } }
            : {}),
        },
        data: { isActive: false },
      })
      const sourceOrdinals = new Map<string, number>()
      for (const source of sources) {
        const config = providerConfig[source.provider]
        const ordinal = (sourceOrdinals.get(source.language) ?? 0) + 1
        sourceOrdinals.set(source.language, ordinal)
        const publicLabel = anonymousSourceLabel(source.language, ordinal)
        const externalEditionId = externalKey(
          `${source.provider}:${source.language}:${source.url}`,
        )
        await tx.catalogSourceEdition.upsert({
          where: {
            catalogSeriesId_externalEditionId: {
              catalogSeriesId: saved.id,
              externalEditionId,
            },
          },
          create: {
            catalogSeriesId: saved.id,
            externalEditionId,
            sourceUrl: source.url,
            backendPlatform: config.backendPlatform,
            sourceLanguage: source.language,
            publicSourceLabel: publicLabel,
            publicDescription: sourceDescription(source.language),
            priority: config.priority,
            isActive: true,
          },
          update: {
            sourceUrl: source.url,
            backendPlatform: config.backendPlatform,
            sourceLanguage: source.language,
            publicSourceLabel: publicLabel,
            publicDescription: sourceDescription(source.language),
            priority: config.priority,
            isActive: true,
          },
        })
      }
      return saved
    })

    const selected = await this.getSeriesDetails(series.id)
    if (!selected) throw new Error("AniList serisi kaydedilemedi.")
    return selected
  }

  async getSeriesDetails(catalogSeriesId: string) {
    const series = await db.catalogSeries.findUnique({
      where: { id: catalogSeriesId, isActive: true },
      include: {
        editions: {
          where: { isActive: true },
          orderBy: { priority: "desc" },
        },
      },
    })
    if (!series) return null
    return {
      id: series.id,
      canonicalKey: series.canonicalKey,
      canonicalSeriesId: series.canonicalSeriesId ?? undefined,
      title: series.title,
      originalTitle: series.originalTitle,
      alternativeTitles: series.alternativeTitles,
      description: series.description,
      cover: `/api/translation/catalog/${series.id}/cover`,
      publicationStatus: publicPublicationStatus(series.publicationStatus),
      editions: series.editions.flatMap((edition, index, editions) => {
        const ordinal =
          editions
            .slice(0, index)
            .filter(
              (candidate) =>
                candidate.sourceLanguage === edition.sourceLanguage,
            ).length + 1
        const mapped = publicEdition(
          edition,
          [],
          false,
          anonymousSourceLabel(edition.sourceLanguage, ordinal),
        )
        return mapped ? [mapped] : []
      }),
    } satisfies PublicCatalogSeries
  }

  async getSourceEditionDetails(sourceEditionId: string) {
    return this.hydrateEdition(sourceEditionId)
  }

  async listSourceEditions(catalogSeriesId: string) {
    return (await this.getSeriesDetails(catalogSeriesId))?.editions ?? []
  }

  async listSourceChapters(sourceEditionId: string) {
    return (await this.hydrateEdition(sourceEditionId))?.chapters ?? []
  }

  async refreshSourceEdition(sourceEditionId: string) {
    await this.hydrateEdition(sourceEditionId, true)
  }

  private async hydrateEdition(
    sourceEditionId: string,
    force = false,
  ): Promise<PublicSourceEdition | null> {
    const edition = await db.catalogSourceEdition.findUnique({
      where: { id: sourceEditionId, isActive: true },
      include: {
        catalogSeries: {
          include: {
            editions: {
              where: { isActive: true },
              orderBy: { priority: "desc" },
            },
          },
        },
        chapters: {
          where: { isAvailable: true },
          orderBy: { sortKey: "asc" },
        },
      },
    })
    if (!edition) return null
    const provider = sourceProviderFromUrl(edition.sourceUrl)
    const url = provider
      ? validatedSourceUrl(provider, edition.sourceUrl)
      : null
    if (!provider || !url) return null

    let publicChapters: CatalogChapter[] = edition.chapters.map((chapter) => ({
      id: chapter.id,
      externalChapterId: chapter.externalChapterId,
      number: chapter.chapterNumber,
      sortKey: chapter.sortKey,
      title: chapter.title ?? undefined,
      publishedAt: chapter.publishedAt?.toISOString(),
    }))
    let currentEdition = edition
    const stale =
      !edition.lastUpdatedAt ||
      Date.now() - edition.lastUpdatedAt.getTime() > 15 * 60_000
    if (force || publicChapters.length === 0 || stale) {
      let details: MandownSourceDetailsOutput
      try {
        details = await mandownSourceDetails(url)
      } catch (error) {
        if (!isUnavailableNaverMirrorError(error)) throw error
        await db.catalogSourceEdition.update({
          where: { id: edition.id },
          data: { isActive: false },
        })
        return null
      }
      const refreshedAt = new Date()
      publicChapters = await db.$transaction(async (tx) => {
        await tx.catalogSeries.update({
          where: { id: edition.catalogSeriesId },
          data: {
            description:
              details.metadata.description || edition.catalogSeries.description,
            coverPath:
              details.metadata.cover_art || edition.catalogSeries.coverPath,
          },
        })
        const synchronized = await syncCatalogSourceChapters(
          tx,
          edition.id,
          details.chapters,
        )
        await tx.catalogSourceEdition.update({
          where: { id: edition.id },
          data: { lastUpdatedAt: refreshedAt },
        })
        return synchronized
      })
      currentEdition = { ...edition, lastUpdatedAt: refreshedAt }
    }
    const ordinal =
      edition.catalogSeries.editions
        .filter(
          (candidate) => candidate.sourceLanguage === edition.sourceLanguage,
        )
        .findIndex((candidate) => candidate.id === edition.id) + 1
    return publicEdition(
      currentEdition,
      publicChapters,
      true,
      anonymousSourceLabel(edition.sourceLanguage, Math.max(1, ordinal)),
    )
  }

  async sourceUrl(sourceEditionId: string) {
    const edition = await db.catalogSourceEdition.findUnique({
      where: { id: sourceEditionId, isActive: true },
    })
    const provider = sourceProviderFromUrl(edition?.sourceUrl ?? null)
    const url = provider
      ? validatedSourceUrl(provider, edition?.sourceUrl ?? null)
      : null
    if (!edition || !provider || !url)
      throw new Error("Mandown kaynak URL eşlemesi bulunamadı.")
    return url
  }
}

export function getSourceCatalogProvider(): SourceCatalogProvider {
  const provider = process.env.SOURCE_CATALOG_PROVIDER ?? "mandown"
  if (provider === "mandown") return new MandownSourceCatalogProvider()
  throw new Error(`Desteklenmeyen SOURCE_CATALOG_PROVIDER: ${provider}`)
}
