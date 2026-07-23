import type { MetadataRoute } from "next"
import { absoluteUrl } from "~/features/platform/seo"
import { siteConfig } from "~/site-config"

export default function robots(): MetadataRoute.Robots {
  const isProduction =
    process.env.NODE_ENV === "production" &&
    !process.env.VERCEL_ENV?.includes("preview")

  if (!isProduction) {
    return { rules: { userAgent: "*", disallow: "/" } }
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/auth/",
        "/tr/oku/",
        "/en/read/",
        "/tr/arama",
        "/en/search",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteConfig.baseUrl,
  }
}
