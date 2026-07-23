import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { CatalogPage } from "~/components/platform/catalog-page"
import type { CatalogFilters } from "~/features/platform/catalog"
import { isLocale } from "~/features/platform/domain"
import { paths } from "~/features/platform/paths"
import { localeAlternates, pageMetadata } from "~/features/platform/seo"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  if (locale !== "tr") return {}
  return pageMetadata({
    title: "Türkçe Webtoon, Manga ve Manhwa Keşfet",
    description:
      "Türkçe webtoon, manga ve manhwa serilerini format, durum ve çeviri kalite profiline göre keşfedin.",
    canonical: paths.discover("tr"),
    alternates: localeAlternates(paths.discover("tr"), paths.discover("en")),
    locale: "tr",
  })
}

export default async function DiscoverPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<CatalogFilters>
}) {
  const { locale } = await params
  if (!isLocale(locale) || locale !== "tr") notFound()
  return <CatalogPage filters={await searchParams} locale={locale} />
}
