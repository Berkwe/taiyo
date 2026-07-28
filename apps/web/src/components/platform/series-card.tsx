import Image from "next/image"
import Link from "next/link"
import type { Locale, Series } from "~/features/platform/domain"
import { paths } from "~/features/platform/paths"

const typeLabels = {
  WEBTOON: "Webtoon",
  MANGA: "Manga",
  MANHWA: "Manhwa",
  MANHUA: "Manhua",
  COMIC: "Comic",
  LIGHT_NOVEL: "Light novel",
} as const

export function SeriesPoster({
  series,
  priority = false,
}: {
  series: Series
  priority?: boolean
}) {
  return (
    <div className="relative aspect-[2/3] overflow-hidden bg-surface-muted">
      <Image
        alt={`${series.localizations.tr.title} kapak görseli`}
        className="object-cover transition duration-200 group-hover:scale-[1.02]"
        fill
        priority={priority}
        sizes="(max-width: 640px) 44vw, (max-width: 1024px) 28vw, 210px"
        src={series.cover}
        unoptimized={series.cover.startsWith("/api/storage/")}
      />
    </div>
  )
}

export function SeriesCard({
  series,
  locale,
  priority,
}: {
  series: Series
  locale: Locale
  priority?: boolean
}) {
  const title = series.localizations[locale].title
  return (
    <article className="group min-w-0">
      <Link
        aria-label={`${title} seri sayfasını aç`}
        className="block overflow-hidden rounded-md border border-nv-border bg-surface focus-visible:outline-2 focus-visible:outline-ring"
        href={paths.series(locale, series.slug)}
      >
        <SeriesPoster priority={priority} series={series} />
      </Link>
      <div className="pt-3">
        <div className="flex items-center gap-2 text-nv-muted-foreground text-xs">
          <span>{typeLabels[series.type]}</span>
          <span aria-hidden="true">•</span>
          <span>{series.genres[0]}</span>
        </div>
        <h3 className="mt-1 truncate font-semibold">
          <Link
            className="hover:text-nv-primary"
            href={paths.series(locale, series.slug)}
          >
            {title}
          </Link>
        </h3>
        <p className="mt-1 text-nv-muted-foreground text-sm">
          {series.chapters.length} {locale === "tr" ? "bölüm" : "chapters"}
        </p>
      </div>
    </article>
  )
}
