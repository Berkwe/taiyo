import { publicSeries } from "~/features/platform/catalog"
import { ChapterPage, chapterMetadata } from "~/features/platform/chapter-page"

export const generateStaticParams = () =>
  publicSeries.flatMap((series) =>
    series.chapters.map((chapter) => ({
      locale: "en",
      slug: series.slug,
      chapter: chapter.number,
    })),
  )

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string; chapter: string }>
}) {
  const { slug, chapter } = await params
  return chapterMetadata({ locale: "en", slug, chapterNumber: chapter })
}

export default function Page({
  params,
}: {
  params: Promise<{ locale: string; slug: string; chapter: string }>
}) {
  return <ChapterPage expectedLocale="en" params={params} />
}
