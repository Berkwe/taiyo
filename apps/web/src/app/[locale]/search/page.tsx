import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { CatalogPage } from "~/components/platform/catalog-page"
import type { CatalogFilters } from "~/features/platform/catalog"
import { pageMetadata } from "~/features/platform/seo"
import { getPublicSeries } from "~/features/platform/server-series"

export const metadata: Metadata = pageMetadata({
  title: "Search series",
  description:
    "Search the NovoraScans catalogue by title, creator, genre and tag.",
  canonical: "/en/search",
  locale: "en",
  noIndex: true,
})

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<CatalogFilters>
}) {
  if ((await params).locale !== "en") notFound()
  return (
    <CatalogPage
      filters={await searchParams}
      locale="en"
      searchOnly
      series={await getPublicSeries()}
    />
  )
}
