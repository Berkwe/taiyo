import { publicSeries } from "~/features/platform/catalog"
import { SeriesPage, seriesMetadata } from "~/features/platform/series-page"

export const generateStaticParams = () =>
  publicSeries.map((series) => ({ locale: "tr", slug: series.slug }))

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { slug } = await params
  return seriesMetadata({ locale: "tr", slug })
}

export default function Page({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  return <SeriesPage expectedLocale="tr" params={params} />
}
