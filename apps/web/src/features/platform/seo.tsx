import type { Metadata } from "next"
import type { ReactNode } from "react"
import { siteConfig } from "~/site-config"
import type { Locale } from "./domain"

export const absoluteUrl = (path: string) =>
  new URL(path, siteConfig.baseUrl).toString()

export const canonicalUrl = (path: string) =>
  absoluteUrl(path.split("?")[0] ?? path)

export const localeAlternates = (trPath: string, enPath: string) => ({
  tr: absoluteUrl(trPath),
  en: absoluteUrl(enPath),
  "x-default": absoluteUrl(trPath),
})

export const pageMetadata = ({
  title,
  description,
  canonical,
  alternates,
  locale,
  image = "/opengraph-image",
  noIndex = false,
}: {
  title: string
  description: string
  canonical: string
  alternates?: Record<string, string>
  locale: Locale
  image?: string
  noIndex?: boolean
}): Metadata => ({
  title,
  description,
  alternates: {
    canonical: canonicalUrl(canonical),
    languages: alternates,
  },
  robots: noIndex
    ? { index: false, follow: true }
    : { index: true, follow: true },
  openGraph: {
    title,
    description,
    url: canonicalUrl(canonical),
    siteName: siteConfig.name,
    locale: locale === "tr" ? "tr_TR" : "en_US",
    type: "website",
    images: [{ url: image, width: 1200, height: 630, alt: title }],
  },
  twitter: { card: "summary_large_image", title, description, images: [image] },
})

export const metadataTitle = (
  entityTitle: string,
  locale: Locale,
  chapter?: string,
) =>
  chapter
    ? locale === "tr"
      ? `${entityTitle} Bölüm ${chapter} Türkçe Oku`
      : `Read ${entityTitle} Chapter ${chapter}`
    : locale === "tr"
      ? `${entityTitle} Türkçe Oku`
      : `Read ${entityTitle}`

export const shouldIndex = ({
  production,
  isPublic = true,
  isIndexable = true,
  routeType,
}: {
  production: boolean
  isPublic?: boolean
  isIndexable?: boolean
  routeType: "public" | "reader" | "search" | "private"
}) => production && isPublic && isIndexable && routeType === "public"

export const safeJsonLd = (value: unknown) =>
  JSON.stringify(value).replace(/</g, "\\u003c")

export function JsonLd({
  data,
}: {
  data: Record<string, unknown> | Record<string, unknown>[]
}) {
  return (
    <script
      // JSON-LD requires inline text; safeJsonLd escapes markup delimiters.
      // biome-ignore lint/security/noDangerouslySetInnerHtml: type-safe serialized structured data
      dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }}
      type="application/ld+json"
    />
  )
}

export const breadcrumbJsonLd = (
  items: { name: string; url: string }[],
): Record<string, unknown> => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: absoluteUrl(item.url),
  })),
})

export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className="sr-only">{children}</span>
}
