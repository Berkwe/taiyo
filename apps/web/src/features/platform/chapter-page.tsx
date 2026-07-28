import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import type { Locale } from "./domain"
import { getChapter } from "./fixtures"
import { paths } from "./paths"
import { localeAlternates, metadataTitle, pageMetadata } from "./seo"
import { getPublicSeriesBySlug } from "./server-series"
import { selectDefaultRelease } from "./source-editions"

export async function chapterMetadata({
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
  const title = series.localizations[locale].title
  return pageMetadata({
    title: metadataTitle(title, locale, chapter.number),
    description: `${chapter.localizations[locale].description} ${title} ${locale === "tr" ? "bölümünü mevcut çeviri sürümleriyle okuyun." : "is available in multiple translation editions."}`,
    canonical: paths.chapter(locale, slug, chapter.number),
    alternates: localeAlternates(
      paths.chapter("tr", slug, chapter.number),
      paths.chapter("en", slug, chapter.number),
    ),
    locale,
    image: series.cover,
  })
}

export async function ChapterPage({
  params,
  expectedLocale,
}: {
  params: Promise<{ locale: string; slug: string; chapter: string }>
  expectedLocale: Locale
}) {
  const { locale, slug, chapter: chapterNumber } = await params
  const series = await getPublicSeriesBySlug(slug)
  const chapter = series ? getChapter(series, chapterNumber) : undefined
  if (locale !== expectedLocale || !series || !chapter) notFound()
  const release = selectDefaultRelease(chapter, expectedLocale)
  if (!release) notFound()
  return redirect(
    paths.reader(expectedLocale, series.slug, chapter.number, release.id),
  )
}
