import { db, type Prisma } from "@taiyomoe/db"
import type { Chapter, ChapterRelease, LocalizedText, Series } from "./domain"
import { seriesFixtures } from "./fixtures"

const storageUrl = (storageKey: string) =>
  `/api/storage/${storageKey
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`

function localizedSeries(
  localizations: Array<{
    locale: string
    title: string
    shortTitle: string | null
    description: string
  }>,
) {
  const fallback = localizations.find((item) => item.locale === "tr") ??
    localizations.find((item) => item.locale === "en") ?? {
      title: "Mandown serisi",
      shortTitle: null,
      description: "Mandown ile indirilen seri.",
    }
  const localized = (locale: "tr" | "en"): LocalizedText => {
    const value =
      localizations.find((item) => item.locale === locale) ?? fallback
    return {
      title: value.title,
      ...(value.shortTitle ? { shortTitle: value.shortTitle } : {}),
      description: value.description,
    }
  }
  return { tr: localized("tr"), en: localized("en") }
}

function localizedChapter(
  chapterNumber: string,
  localizations: Array<{
    locale: string
    title: string | null
    description: string | null
  }>,
) {
  const fallback = localizations.find((item) => item.locale === "tr") ??
    localizations.find((item) => item.locale === "en") ?? {
      title: null,
      description: null,
    }
  const localized = (locale: "tr" | "en") => {
    const value =
      localizations.find((item) => item.locale === locale) ?? fallback
    return {
      title: value.title ?? `Bölüm ${chapterNumber}`,
      description:
        value.description ??
        `${chapterNumber}. bölüm okuma ve sürüm bilgileri.`,
    }
  }
  return { tr: localized("tr"), en: localized("en") }
}

const publicSeriesInclude = {
  localizations: true,
  aliases: true,
  creators: { include: { creator: true } },
  genres: { include: { genre: { include: { localizations: true } } } },
  tags: { include: { tag: { include: { localizations: true } } } },
  chapters: {
    where: { deletedAt: null },
    orderBy: { sortKey: "asc" },
    include: {
      localizations: true,
      releases: {
        where: {
          status: "PUBLISHED",
          isPublic: true,
          isActive: true,
          deletedAt: null,
        },
        orderBy: { publishedAt: "desc" },
        include: {
          pages: { orderBy: { pageNumber: "asc" } },
          source: true,
          translationProfile: true,
          releaseGroup: true,
        },
      },
    },
  },
} as const

type PublicDbSeries = Prisma.SeriesGetPayload<{
  include: typeof publicSeriesInclude
}>

function mapRelease(
  release: PublicDbSeries["chapters"][number]["releases"][number],
  chapterNumber: string,
): ChapterRelease | null {
  if (
    !release.source ||
    !release.publishedAt ||
    (release.targetLanguage !== "tr" && release.targetLanguage !== "en")
  ) {
    return null
  }
  return {
    id: release.id,
    targetLanguage: release.targetLanguage,
    sourceLanguage: release.sourceLanguage,
    source: {
      id: release.source.id,
      sourceLanguage: release.source.language,
      ...(release.source.displayLabel
        ? { displayLabel: release.source.displayLabel }
        : {}),
      descriptions: {
        tr: release.source.description,
        en: release.source.description,
      },
      priority: release.source.priority,
      isDefault: release.source.isDefault,
    },
    qualityTier: release.qualityTier === "PREMIUM" ? "premium" : "balanced",
    translationType: release.translationProfile.isAiGenerated
      ? "ai"
      : release.translationProfile.isHumanReviewed
        ? "human"
        : "unknown",
    isActive: release.isActive,
    pipelineVersion: release.pipelineVersion ?? "mandown",
    profileId: release.translationProfile.slug,
    revision: release.revision,
    releaseGroup: release.releaseGroup?.name ?? "NovoraScans",
    publishedAt: release.publishedAt.toISOString(),
    humanReviewed: release.humanReviewed,
    glossaryUsed: release.glossaryUsed,
    characterMemoryUsed: release.characterMemoryUsed,
    overallQualityScore: release.overallQualityScore ?? 0,
    isCanonicalForLanguage: release.isCanonicalForLanguage,
    isIndexable: release.isIndexable,
    pages: release.pages.map((page) => ({
      pageNumber: page.pageNumber,
      storageKey: page.storageKey,
      src: storageUrl(page.storageKey),
      width: page.width,
      height: page.height,
      alt: `Bölüm ${chapterNumber}, sayfa ${page.pageNumber}`,
    })),
  }
}

function mapSeries(series: PublicDbSeries): Series {
  const chapters: Chapter[] = series.chapters.flatMap((chapter) => {
    const releases = chapter.releases.flatMap((release) => {
      const mapped = mapRelease(release, chapter.chapterNumber)
      return mapped ? [mapped] : []
    })
    if (!releases.length) return []
    const publishedAt =
      releases[0]?.publishedAt ?? chapter.createdAt.toISOString()
    return [
      {
        id: chapter.id,
        number: chapter.chapterNumber,
        sortKey: chapter.sortKey,
        canonicalSlug: chapter.canonicalSlug,
        localizations: localizedChapter(
          chapter.chapterNumber,
          chapter.localizations,
        ),
        publishedAt,
        ...(chapter.thumbnailStorageKey
          ? { thumbnail: storageUrl(chapter.thumbnailStorageKey) }
          : {}),
        releases,
      },
    ]
  })
  const publishedAt = series.publishedAt ?? series.createdAt
  return {
    id: series.id,
    slug: series.slug,
    originalLanguage: series.originalLanguage,
    type: series.type,
    status:
      series.status === "COMPLETED"
        ? "COMPLETED"
        : series.status === "HIATUS"
          ? "HIATUS"
          : "ONGOING",
    contentRating: series.contentRating,
    publicationYear: series.publicationYear ?? publishedAt.getFullYear(),
    updatedAt: series.updatedAt.toISOString(),
    publishedAt: publishedAt.toISOString(),
    accentColor: series.defaultAccentColor ?? "var(--nv-primary)",
    isFeatured: series.isFeatured,
    isSearchable: series.isSearchable,
    isIndexable: series.isIndexable,
    popularity: 0,
    localizations: localizedSeries(series.localizations),
    aliases: series.aliases.map((alias) => alias.alias),
    creators: series.creators.map((creator) => ({
      name: creator.creator.name,
      role: creator.role,
    })),
    genres: series.genres.flatMap((item) => {
      const localized =
        item.genre.localizations.find((value) => value.locale === "tr") ??
        item.genre.localizations[0]
      return localized ? [localized.name] : []
    }),
    tags: series.tags.flatMap((item) => {
      const localized =
        item.tag.localizations.find((value) => value.locale === "tr") ??
        item.tag.localizations[0]
      return localized ? [localized.name] : []
    }),
    cover: series.coverStorageKey
      ? storageUrl(series.coverStorageKey)
      : "/assets/brand/novora-stacked-logo.png",
    ...(series.bannerStorageKey
      ? { banner: storageUrl(series.bannerStorageKey) }
      : {}),
    chapters,
  }
}

export async function getPublicSeries() {
  const databaseSeries = await db.series.findMany({
    where: {
      deletedAt: null,
      publishedAt: { not: null },
      isSearchable: true,
      isIndexable: true,
    },
    orderBy: { updatedAt: "desc" },
    include: publicSeriesInclude,
  })
  const mapped = databaseSeries
    .map(mapSeries)
    .filter((series) => series.chapters.length > 0)
  const databaseSlugs = new Set(mapped.map((series) => series.slug))
  return [
    ...mapped,
    ...seriesFixtures.filter(
      (series) =>
        series.isIndexable &&
        series.isSearchable &&
        !databaseSlugs.has(series.slug),
    ),
  ]
}

export async function getPublicSeriesBySlug(slug: string) {
  const fixture = seriesFixtures.find((series) => series.slug === slug)
  if (fixture) return fixture
  const series = await db.series.findFirst({
    where: {
      slug,
      deletedAt: null,
      publishedAt: { not: null },
      isSearchable: true,
      isIndexable: true,
    },
    include: publicSeriesInclude,
  })
  if (!series) return undefined
  const mapped = mapSeries(series)
  return mapped.chapters.length ? mapped : undefined
}

export interface PublicSeriesSearchItem {
  id: string
  slug: string
  title: string
  type: Series["type"]
  genre?: string
  cover: string
}

export async function getPublicSeriesSearchItems({
  locale,
  query,
  limit = 6,
}: {
  locale: "tr" | "en"
  query: string
  limit?: number
}) {
  const databaseSeries = await db.series.findMany({
    where: {
      deletedAt: null,
      publishedAt: { not: null },
      isSearchable: true,
      isIndexable: true,
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      slug: true,
      type: true,
      coverStorageKey: true,
      localizations: {
        select: { locale: true, title: true },
      },
      aliases: { select: { alias: true } },
      creators: { select: { creator: { select: { name: true } } } },
      genres: {
        select: {
          genre: {
            select: {
              localizations: { select: { locale: true, name: true } },
            },
          },
        },
      },
      tags: {
        select: {
          tag: {
            select: {
              localizations: { select: { locale: true, name: true } },
            },
          },
        },
      },
    },
  })
  const fixtureItems = seriesFixtures
    .filter((series) => series.isIndexable && series.isSearchable)
    .map((series) => ({
      id: series.id,
      slug: series.slug,
      title: series.localizations[locale].title,
      type: series.type,
      genre: series.genres[0],
      cover: series.cover,
      searchable: [
        series.localizations.tr.title,
        series.localizations.en.title,
        ...series.aliases,
        ...series.genres,
        ...series.tags,
        ...series.creators.map((creator) => creator.name),
      ].join(" "),
    }))
  const databaseItems = databaseSeries.map((series) => {
    const localized =
      series.localizations.find((item) => item.locale === locale) ??
      series.localizations.find((item) => item.locale === "tr") ??
      series.localizations[0]
    const genreLocalizations = series.genres.flatMap(
      (item) => item.genre.localizations,
    )
    const genre =
      genreLocalizations.find((item) => item.locale === locale)?.name ??
      genreLocalizations[0]?.name
    return {
      id: series.id,
      slug: series.slug,
      title: localized?.title ?? series.slug,
      type: series.type,
      genre,
      cover: series.coverStorageKey
        ? storageUrl(series.coverStorageKey)
        : "/assets/brand/novora-stacked-logo.png",
      searchable: [
        ...series.localizations.map((item) => item.title),
        ...series.aliases.map((item) => item.alias),
        ...series.creators.map((item) => item.creator.name),
        ...genreLocalizations.map((item) => item.name),
        ...series.tags.flatMap((item) =>
          item.tag.localizations.map((value) => value.name),
        ),
      ].join(" "),
    }
  })
  const normalizedQuery = query.trim().toLocaleLowerCase(locale)
  return [...databaseItems, ...fixtureItems]
    .filter((item) =>
      normalizedQuery
        ? item.searchable.toLocaleLowerCase(locale).includes(normalizedQuery)
        : true,
    )
    .filter(
      (item, index, all) =>
        all.findIndex((candidate) => candidate.slug === item.slug) === index,
    )
    .slice(0, Math.max(1, Math.min(12, limit)))
    .map(({ searchable: _searchable, ...item }) => item)
}

export async function getPublicSeriesSlugs() {
  const database = await db.series.findMany({
    where: {
      deletedAt: null,
      publishedAt: { not: null },
      isSearchable: true,
      isIndexable: true,
    },
    select: { slug: true },
  })
  return [
    ...new Set([
      ...database.map((series) => series.slug),
      ...seriesFixtures
        .filter((series) => series.isIndexable && series.isSearchable)
        .map((series) => series.slug),
    ]),
  ]
}
