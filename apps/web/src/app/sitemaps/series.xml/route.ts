import {
  seriesSitemapEntries,
  sitemapXml,
  xmlResponse,
} from "~/features/platform/sitemap"

export async function GET() {
  return xmlResponse(sitemapXml(await seriesSitemapEntries()))
}
