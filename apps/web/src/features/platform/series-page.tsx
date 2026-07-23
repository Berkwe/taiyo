import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { SeriesDetail } from "~/components/platform/series-detail"
import { isLocale, type Locale } from "./domain"
import { getSeries } from "./fixtures"
import { paths } from "./paths"
import { localeAlternates, metadataTitle, pageMetadata } from "./seo"

export async function seriesMetadata({
  locale,
  slug,
}: {
  locale: Locale
  slug: string
}): Promise<Metadata> {
  const series = getSeries(slug)
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
  const series = getSeries(slug)
  if (
    !isLocale(locale) ||
    locale !== expectedLocale ||
    !series ||
    !series.isIndexable
  ) {
    notFound()
  }
  return <SeriesDetail locale={locale} series={series} />
}
