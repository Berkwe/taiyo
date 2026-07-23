# Technical SEO

Localized home, discovery, genre, series, and chapter landing pages are
indexable. Search and reader pages are `noindex, follow`; readers canonicalize
to their chapter landing page. Metadata uses the central base URL and includes
descriptions, Open Graph, Twitter, canonical, and existing TR/EN alternates.

`sitemap.ts` includes only public landing, series, and chapter URLs.
`robots.ts` blocks all non-production deployments and excludes API, auth,
search, and reader routes in production. Home uses Organization/WebSite JSON-LD;
series and chapter pages add ComicSeries/ComicIssue and breadcrumbs.

Set `NEXT_PUBLIC_SITE_URL` to the production origin before deployment.
Do not expose arbitrary filtered query combinations as canonical landing pages.
