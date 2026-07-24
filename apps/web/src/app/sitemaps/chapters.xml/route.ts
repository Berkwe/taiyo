import {
  chapterSitemapEntries,
  sitemapXml,
  xmlResponse,
} from "~/features/platform/sitemap"

export function GET() {
  return xmlResponse(sitemapXml(chapterSitemapEntries()))
}
