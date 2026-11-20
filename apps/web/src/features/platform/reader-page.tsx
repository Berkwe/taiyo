import { db } from "@taiyomoe/db"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Reader } from "~/components/platform/reader"
import { getSession } from "~/utils/get-session"
import type { Locale } from "./domain"
import { getChapter, getRelease } from "./fixtures"
import { paths } from "./paths"
import { pageMetadata } from "./seo"
import { getPublicSeriesBySlug } from "./server-series"
import { selectDefaultRelease } from "./source-editions"

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function translationRequestHrefs({
  chapterId,
  chapterNumber,
  locale,
  qualityTier,
  releaseId,
  seriesId,
  seriesTitle,
}: {
  chapterId: string
  chapterNumber: string
  locale: Locale
  qualityTier: "balanced" | "premium"
  releaseId: string
  seriesId: string
  seriesTitle: string
}) {
  const numericChapter = Number(chapterNumber)
  const fallbackNextChapter = Number.isFinite(numericChapter)
    ? String(numericChapter + 1)
    : chapterNumber
  const fallbackBase = `${paths.translate(locale)}?q=${encodeURIComponent(
    seriesTitle,
  )}&seriesId=${encodeURIComponent(seriesId)}&fromReader=1&outputLanguage=${locale}&quality=${qualityTier}`
  const fallback = {
    continuation: `${fallbackBase}&nextChapter=${encodeURIComponent(
      fallbackNextChapter,
    )}&selectionMode=range`,
    currentSource: `${fallbackBase}&nextChapter=${encodeURIComponent(
      chapterNumber,
    )}&selectionMode=single`,
    sourceSearch: `${fallbackBase}&nextChapter=${encodeURIComponent(
      chapterNumber,
    )}&selectionMode=single&chooseSource=1`,
  }
  if (
    !uuidPattern.test(seriesId) ||
    !uuidPattern.test(chapterId) ||
    !uuidPattern.test(releaseId)
  ) {
    return fallback
  }
  const publishedRelease = await db.chapterRelease.findFirst({
    where: { id: releaseId, chapterId, deletedAt: null },
    select: {
      source: { select: { externalId: true, platform: true } },
    },
  })
  if (!publishedRelease?.source?.externalId) return fallback
  const catalog = await db.catalogSeries.findFirst({
    where: { canonicalSeriesId: seriesId, isActive: true },
    select: {
      id: true,
      editions: {
        where: {
          backendPlatform: publishedRelease.source.platform,
          isActive: true,
        },
        orderBy: { priority: "desc" },
        select: {
          id: true,
          chapters: {
            where: { isAvailable: true },
            orderBy: { sortKey: "asc" },
            select: {
              chapterNumber: true,
              externalChapterId: true,
              sortKey: true,
            },
          },
        },
      },
    },
  })
  if (!catalog) return fallback
  const edition = catalog.editions.find((candidate) =>
    candidate.chapters.some(
      (item) => item.externalChapterId === publishedRelease.source?.externalId,
    ),
  )
  if (!edition) {
    return {
      ...fallback,
      sourceSearch: `${paths.translateSeries(locale, catalog.id)}?nextChapter=${encodeURIComponent(
        chapterNumber,
      )}&selectionMode=single&chooseSource=1&fromReader=1`,
    }
  }
  const current = edition.chapters.find(
    (item) => item.externalChapterId === publishedRelease.source?.externalId,
  )
  const requested =
    edition.chapters.find(
      (item) => current && item.sortKey > current.sortKey,
    ) ?? current
  if (!current || !requested) return fallback
  const exactBase = `${paths.translateSeries(locale, catalog.id)}?sourceEditionId=${edition.id}&outputLanguage=${locale}&quality=${qualityTier}`
  return {
    continuation: `${exactBase}&nextChapter=${encodeURIComponent(
      requested.chapterNumber,
    )}&selectionMode=range&fromReader=1`,
    currentSource: `${exactBase}&nextChapter=${encodeURIComponent(
      current.chapterNumber,
    )}&selectionMode=single&fromReader=1`,
    sourceSearch: `${paths.translateSeries(locale, catalog.id)}?nextChapter=${encodeURIComponent(
      current.chapterNumber,
    )}&selectionMode=single&chooseSource=1&fromReader=1`,
  }
}

export async function readerMetadata({
  locale,
  slug,
  chapterNumber,
}: {
  locale: Locale
  slug: string
  chapterNumber: string
}): Promise<Metadata> {
  const series = await getPublicSeriesBySlug(slug)
  const chapter = series ? getChapter(series, chapterNumber) : undefined
  if (!series || !chapter) return {}
  return pageMetadata({
    title: `${series.localizations[locale].title} · ${locale === "tr" ? "Okuyucu" : "Reader"}`,
    description: chapter.localizations[locale].description,
    canonical: paths.chapter(locale, slug, chapterNumber),
    locale,
    noIndex: true,
  })
}

export async function ReaderPage({
  params,
  expectedLocale,
}: {
  params: Promise<{
    locale: string
    slug: string
    chapter: string
    releaseId: string
  }>
  expectedLocale: Locale
}) {
  const { locale, slug, chapter: chapterNumber, releaseId } = await params
  const series = await getPublicSeriesBySlug(slug)
  const chapter = series ? getChapter(series, chapterNumber) : undefined
  const release = chapter ? getRelease(chapter, releaseId) : undefined
  if (
    locale !== expectedLocale ||
    !series ||
    !chapter ||
    !release ||
    !release.isActive ||
    release.targetLanguage !== expectedLocale
  ) {
    notFound()
  }
  const index = series.chapters.findIndex((item) => item.id === chapter.id)
  const previous = series.chapters[index - 1]
  const next = series.chapters[index + 1]
  const resolveAdjacent = (adjacent: typeof chapter | undefined) => {
    if (!adjacent) return undefined
    const adjacentRelease =
      adjacent.releases.find(
        (item) =>
          item.isActive &&
          item.targetLanguage === expectedLocale &&
          item.source.id === release.source.id,
      ) ?? selectDefaultRelease(adjacent, expectedLocale)
    return adjacentRelease
      ? paths.reader(
          expectedLocale,
          series.slug,
          adjacent.number,
          adjacentRelease.id,
        )
      : undefined
  }
  const chapterOptions = series.chapters.flatMap((item) => {
    const itemRelease =
      item.releases.find(
        (candidate) =>
          candidate.isActive &&
          candidate.targetLanguage === expectedLocale &&
          candidate.source.id === release.source.id,
      ) ?? selectDefaultRelease(item, expectedLocale)
    return itemRelease
      ? [
          {
            number: item.number,
            href: paths.reader(
              expectedLocale,
              series.slug,
              item.number,
              itemRelease.id,
            ),
          },
        ]
      : []
  })
  const session = await getSession()
  const translationHrefs = await translationRequestHrefs({
    chapterId: chapter.id,
    chapterNumber: chapter.number,
    locale: expectedLocale,
    qualityTier: release.qualityTier,
    releaseId: release.id,
    seriesId: series.id,
    seriesTitle: series.localizations[expectedLocale].title,
  })
  return (
    <Reader
      authenticated={Boolean(session?.user)}
      chapter={chapter}
      chapterOptions={chapterOptions}
      locale={expectedLocale}
      nextHref={resolveAdjacent(next)}
      previousHref={resolveAdjacent(previous)}
      release={release}
      series={series}
      currentSourceTranslationHref={translationHrefs.currentSource}
      sourceSearchHref={translationHrefs.sourceSearch}
      translationHref={translationHrefs.continuation}
    />
  )
}
