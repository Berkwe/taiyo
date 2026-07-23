import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { CatalogPage } from "~/components/platform/catalog-page"
import type { CatalogFilters } from "~/features/platform/catalog"
import { pageMetadata } from "~/features/platform/seo"

export const metadata: Metadata = pageMetadata({
  title: "Seri ara",
  description: "NovoraScans kataloğunda başlık, yazar, tür ve etiket arayın.",
  canonical: "/tr/arama",
  locale: "tr",
  noIndex: true,
})

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<CatalogFilters>
}) {
  if ((await params).locale !== "tr") notFound()
  return <CatalogPage filters={await searchParams} locale="tr" searchOnly />
}
