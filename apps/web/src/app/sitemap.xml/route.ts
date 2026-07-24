import { sitemapIndexXml, xmlResponse } from "~/features/platform/sitemap"

export function GET() {
  return xmlResponse(
    sitemapIndexXml([
      "/sitemaps/static.xml",
      "/sitemaps/series.xml",
      "/sitemaps/chapters.xml",
    ]),
  )
}
