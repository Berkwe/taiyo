import type { MetadataRoute } from "next"
import { publicSeries } from "~/features/platform/catalog"
import { locales } from "~/features/platform/domain"
import { paths, slugify } from "~/features/platform/paths"
import { absoluteUrl } from "~/features/platform/seo"

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = locales.flatMap((locale) => [
    {
      url: absoluteUrl(paths.home(locale)),
      lastModified: new Date("2026-07-22"),
    },
    {
      url: absoluteUrl(paths.discover(locale)),
      lastModified: new Date("2026-07-22"),
    },
    ...["Fantastik", "Bilim Kurgu", "Gizem"].map((genre) => ({
      url: absoluteUrl(paths.genre(locale, slugify(genre))),
      lastModified: new Date("2026-07-22"),
    })),
  ])

  const contentRoutes = publicSeries.flatMap((series) =>
    locales.flatMap((locale) => [
      {
        url: absoluteUrl(paths.series(locale, series.slug)),
        lastModified: new Date(series.updatedAt),
      },
      ...series.chapters.map((chapter) => ({
        url: absoluteUrl(paths.chapter(locale, series.slug, chapter.number)),
        lastModified: new Date(chapter.publishedAt),
      })),
    ]),
  )

  return [...staticRoutes, ...contentRoutes]
}
