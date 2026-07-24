import { publicSeries } from "./catalog"
import { locales } from "./domain"
import { paths, slugify } from "./paths"

const absoluteUrl = (pathname: string) =>
  new URL(
    pathname,
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ).toString()

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
}

export function sitemapXml(
  entries: Array<{ url: string; lastModified: string }>,
) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries
    .map(
      (entry) =>
        `  <url><loc>${escapeXml(entry.url)}</loc><lastmod>${escapeXml(entry.lastModified)}</lastmod></url>`,
    )
    .join("\n")}\n</urlset>\n`
}

export function sitemapIndexXml(paths: string[]) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths
    .map(
      (item) =>
        `  <sitemap><loc>${escapeXml(absoluteUrl(item))}</loc></sitemap>`,
    )
    .join("\n")}\n</sitemapindex>\n`
}

export const staticSitemapEntries = () =>
  locales.flatMap((locale) => [
    {
      url: absoluteUrl(paths.home(locale)),
      lastModified: "2026-07-24",
    },
    {
      url: absoluteUrl(paths.discover(locale)),
      lastModified: "2026-07-24",
    },
    {
      url: absoluteUrl(paths.about(locale)),
      lastModified: "2026-07-24",
    },
    ...["Fantastik", "Bilim Kurgu", "Gizem"].map((genre) => ({
      url: absoluteUrl(paths.genre(locale, slugify(genre))),
      lastModified: "2026-07-24",
    })),
  ])

export const seriesSitemapEntries = () =>
  publicSeries.flatMap((series) =>
    locales.map((locale) => ({
      url: absoluteUrl(paths.series(locale, series.slug)),
      lastModified: series.updatedAt,
    })),
  )

export const chapterSitemapEntries = () =>
  publicSeries.flatMap((series) =>
    locales.flatMap((locale) =>
      series.chapters.map((chapter) => ({
        url: absoluteUrl(paths.chapter(locale, series.slug, chapter.number)),
        lastModified: chapter.publishedAt,
      })),
    ),
  )

export const xmlResponse = (body: string) =>
  new Response(body, {
    headers: {
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "Content-Type": "application/xml; charset=utf-8",
    },
  })
