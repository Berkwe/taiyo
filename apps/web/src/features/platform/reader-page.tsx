import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Reader } from "~/components/platform/reader"
import { getSession } from "~/utils/get-session"
import type { Locale } from "./domain"
import { getChapter, getRelease, getSeries } from "./fixtures"
import { paths } from "./paths"
import { pageMetadata } from "./seo"

export async function readerMetadata({
  locale,
  slug,
  chapterNumber,
}: {
  locale: Locale
  slug: string
  chapterNumber: string
}): Promise<Metadata> {
  const series = getSeries(slug)
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
  const series = getSeries(slug)
  const chapter = series ? getChapter(series, chapterNumber) : undefined
  const release = chapter ? getRelease(chapter, releaseId) : undefined
  if (
    locale !== expectedLocale ||
    !series ||
    !chapter ||
    !release ||
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
          item.targetLanguage === expectedLocale &&
          item.profileId === release.profileId,
      ) ??
      adjacent.releases.find(
        (item) =>
          item.targetLanguage === expectedLocale && item.isCanonicalForLanguage,
      )
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
          candidate.targetLanguage === expectedLocale &&
          candidate.profileId === release.profileId,
      ) ??
      item.releases.find(
        (candidate) =>
          candidate.targetLanguage === expectedLocale &&
          candidate.isCanonicalForLanguage,
      )
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
    />
  )
}
