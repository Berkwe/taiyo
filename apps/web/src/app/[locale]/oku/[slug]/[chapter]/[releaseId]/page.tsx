import { publicSeries } from "~/features/platform/catalog"
import { ReaderPage, readerMetadata } from "~/features/platform/reader-page"

export const generateStaticParams = () =>
  publicSeries.flatMap((series) =>
    series.chapters.flatMap((chapter) =>
      chapter.releases
        .filter((release) => release.targetLanguage === "tr")
        .map((release) => ({
          locale: "tr",
          slug: series.slug,
          chapter: chapter.number,
          releaseId: release.id,
        })),
    ),
  )

export async function generateMetadata({
  params,
}: {
  params: Promise<{
    locale: string
    slug: string
    chapter: string
    releaseId: string
  }>
}) {
  const { slug, chapter } = await params
  return readerMetadata({ locale: "tr", slug, chapterNumber: chapter })
}

export default function Page({
  params,
}: {
  params: Promise<{
    locale: string
    slug: string
    chapter: string
    releaseId: string
  }>
}) {
  return <ReaderPage expectedLocale="tr" params={params} />
}
