import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { TranslationSeriesPageContent } from "~/app/translate/[seriesId]/page"
import { isLocale } from "~/features/platform/domain"
import { paths } from "~/features/platform/paths"
import { localeAlternates, pageMetadata } from "~/features/platform/seo"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; seriesId: string }>
}): Promise<Metadata> {
  const { locale, seriesId } = await params
  if (!isLocale(locale)) return {}
  return pageMetadata({
    title: locale === "tr" ? "Seri AI çevirisi" : "AI Series Translation",
    description:
      locale === "tr"
        ? "Kaynağı, bölümleri ve AI çeviri kalitesini seç."
        : "Choose the source, chapters, and AI translation quality.",
    canonical: paths.translateSeries(locale, seriesId),
    alternates: localeAlternates(
      paths.translateSeries("tr", seriesId),
      paths.translateSeries("en", seriesId),
    ),
    locale,
    noIndex: true,
  })
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; seriesId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale, seriesId } = await params
  if (!isLocale(locale)) notFound()
  return (
    <TranslationSeriesPageContent
      locale={locale}
      params={Promise.resolve({ seriesId })}
      searchParams={searchParams}
    />
  )
}
