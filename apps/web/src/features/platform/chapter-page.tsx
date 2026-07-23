import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ChapterDetail } from "~/components/platform/chapter-detail"
import type { Locale } from "./domain"
import { getChapter, getSeries } from "./fixtures"
import { paths } from "./paths"
import { localeAlternates, metadataTitle, pageMetadata } from "./seo"

export async function chapterMetadata({
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
  const series = getSeries(slug)
  const chapter = series ? getChapter(series, chapterNumber) : undefined
  if (locale !== expectedLocale || !series || !chapter) notFound()
  return (
    <ChapterDetail chapter={chapter} locale={expectedLocale} series={series} />
  )
}
