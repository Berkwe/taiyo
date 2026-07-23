import {
  GenrePage,
  genreMetadata,
  knownGenres,
} from "~/components/platform/genre-page"
import { slugify } from "~/features/platform/paths"

export const generateStaticParams = () =>
  knownGenres.map((genre) => ({ locale: "tr", genre: slugify(genre) }))

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; genre: string }>
}) {
  return genreMetadata({ locale: "tr", genreSlug: (await params).genre })
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; genre: string }>
}) {
  return <GenrePage locale="tr" genreSlug={(await params).genre} />
}
