import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { SeriesDetail } from "~/components/platform/series-detail"
import { isLocale, type Locale } from "./domain"
import { paths } from "./paths"
import { localeAlternates, metadataTitle, pageMetadata } from "./seo"
import { getPublicSeriesBySlug, getPublicSeriesSlugs } from "./server-series"

export async function seriesMetadata({
  locale,
  slug,
}: {
  locale: Locale
  slug: string
}): Promise<Metadata> {
  const series = await getPublicSeriesBySlug(slug)
  if (!series) return {}
  const localized = series.localizations[locale]
  return pageMetadata({
    title: metadataTitle(localized.title, locale),
    description: localized.description,
    canonical: paths.series(locale, slug),
    alternates: localeAlternates(
      paths.series("tr", slug),
      paths.series("en", slug),
    ),
    locale,
    image: series.cover,
  })
}

export async function SeriesPage({
  params,
  expectedLocale,
}: {
  params: Promise<{ locale: string; slug: string }>
  expectedLocale: Locale
}) {
  const { locale, slug } = await params
  const [series, randomSlugs] = await Promise.all([
    getPublicSeriesBySlug(slug),
    getPublicSeriesSlugs(),
  ])
  if (
    !isLocale(locale) ||
    locale !== expectedLocale ||
    !series ||
    !series.isIndexable
  ) {
    notFound()
  }
  return (
    <SeriesDetail
      locale={locale}
      randomSeriesHrefs={randomSlugs.map((item) => paths.series(locale, item))}
      series={series}
    />
  )
}
