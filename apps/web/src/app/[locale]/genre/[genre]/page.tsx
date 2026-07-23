import {
  GenrePage,
  genreMetadata,
  knownGenres,
} from "~/components/platform/genre-page"
import { slugify } from "~/features/platform/paths"

export const generateStaticParams = () =>
  knownGenres.map((genre) => ({ locale: "en", genre: slugify(genre) }))

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; genre: string }>
}) {
  return genreMetadata({ locale: "en", genreSlug: (await params).genre })
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; genre: string }>
}) {
  return <GenrePage locale="en" genreSlug={(await params).genre} />
}
