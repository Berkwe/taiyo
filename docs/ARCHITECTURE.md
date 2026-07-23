# Architecture

Public routes live under `apps/web/src/app/[locale]`. Route files validate the
localized path and delegate to feature entry points. Server Components query the
catalog; only theme, progress, and reader interaction use Client Components.

`features/platform/domain.ts` is the UI-facing contract,
`fixtures.ts` is the temporary deterministic adapter, and `catalog.ts` contains
query/filter behavior. This seam will be replaced by a Prisma repository without
changing page components.

The persistent model separates language-independent `Series` and
`PlatformChapter` records from localized metadata and readable
`ChapterRelease` editions. A release owns language, quality profile, revision,
group, QA metrics, publication state, and ordered pages.

SEO helpers centralize absolute URLs, canonical stripping, hreflang, robots
decisions, and safe JSON-LD serialization. `site-config.ts` is the only source
for the product name and base URL.
