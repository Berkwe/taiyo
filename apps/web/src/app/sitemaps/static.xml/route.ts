import {
  sitemapXml,
  staticSitemapEntries,
  xmlResponse,
} from "~/features/platform/sitemap"

export function GET() {
  return xmlResponse(sitemapXml(staticSitemapEntries()))
}
