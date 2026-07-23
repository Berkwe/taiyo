import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { publicSeries } from "~/features/platform/catalog"
import type { Locale } from "~/features/platform/domain"
import { paths, slugify } from "~/features/platform/paths"
import { localeAlternates, pageMetadata } from "~/features/platform/seo"
import { SeriesCard } from "./series-card"

export const knownGenres = [
  ...new Set(publicSeries.flatMap((series) => series.genres)),
]

export async function genreMetadata({
  locale,
  genreSlug,
}: {
  locale: Locale
  genreSlug: string
}): Promise<Metadata> {
  const genre = knownGenres.find((item) => slugify(item) === genreSlug)
  if (!genre) return {}
  return pageMetadata({
    title:
      locale === "tr"
        ? `${genre} Webtoon, Manga ve Manhwa`
        : `${genre} Webtoons, Manga and Manhwa`,
    description:
      locale === "tr"
        ? `${genre} türündeki Türkçe webtoon, manga ve manhwa serilerini çeviri kalite seçenekleriyle keşfedin.`
        : `Discover ${genre} webtoons, manga and manhwa with clear translation quality choices.`,
    canonical: paths.genre(locale, genre),
    alternates: localeAlternates(
      paths.genre("tr", genre),
      paths.genre("en", genre),
    ),
    locale,
  })
}

export function GenrePage({
  locale,
  genreSlug,
}: {
  locale: Locale
  genreSlug: string
}) {
  const genre = knownGenres.find((item) => slugify(item) === genreSlug)
  if (!genre) notFound()
  const results = publicSeries.filter((series) => series.genres.includes(genre))
  return (
    <main className="py-12 content-shell" id="main-content">
      <p className="font-semibold text-nv-primary text-sm uppercase tracking-[.15em]">
        {locale === "tr" ? "Türe göre keşfet" : "Explore by genre"}
      </p>
      <h1 className="mt-3 font-bold text-4xl tracking-tight">{genre}</h1>
      <p className="mt-4 max-w-3xl text-nv-muted-foreground leading-7">
        {locale === "tr"
          ? `${genre} türündeki serileri, mevcut Türkçe çeviri kalite sürümleriyle birlikte inceleyin.`
          : `Browse ${genre} series together with their available translation quality editions.`}
      </p>
      <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {results.map((series) => (
          <SeriesCard locale={locale} series={series} key={series.id} />
        ))}
      </div>
    </main>
  )
}
