import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { CatalogPage } from "~/components/platform/catalog-page"
import type { CatalogFilters } from "~/features/platform/catalog"
import { paths } from "~/features/platform/paths"
import { localeAlternates, pageMetadata } from "~/features/platform/seo"
import { getPublicSeries } from "~/features/platform/server-series"

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "Discover Webtoons, Manga and Manhwa",
    description:
      "Discover webtoons, manga and manhwa by format, status and translation quality profile.",
    canonical: paths.discover("en"),
    alternates: localeAlternates(paths.discover("tr"), paths.discover("en")),
    locale: "en",
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
  if (locale !== "en") notFound()
  return (
    <CatalogPage
      filters={await searchParams}
      locale="en"
      series={await getPublicSeries()}
    />
  )
}
