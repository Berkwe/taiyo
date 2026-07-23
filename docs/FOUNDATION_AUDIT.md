# Foundation audit

## Baseline

The project is Taiyō at `6362d6d9d82967141e00c8202a631f4af3f4dc65` on
`feature/platform-foundation`, with the user's fork as `origin` and Taiyō as `upstream`.
It is a pnpm/Turborepo monorepo using Next.js 16 App Router, React 19, strict
TypeScript, Tailwind 4, next-intl, Prisma 7/PostgreSQL, tRPC, Better Auth,
Meilisearch, Dragonfly-compatible cache, and S3 adapters.

## Keep

The monorepo boundaries, App Router, existing accessible primitives, next-intl,
Prisma, tRPC, auth, search, cache, and storage packages remain the foundation.
No dependency was upgraded and no parallel API/repository layer was added.

## Change in this foundation

NovoraScans adds locale-prefixed public routes, semantic theme tokens, fictional
catalog fixtures, a vertical reader, technical SEO endpoints, and a normalized
`Series`/`PlatformChapter`/`ChapterRelease` schema beside legacy Taiyō media
models. The separate names avoid a destructive migration of the legacy
`Chapter` table.

## Gaps and debt

- Public pages currently read deterministic fixtures, not the new database tables.
- The legacy `Chapter.number` is a float; new chapters use exact strings plus an
  integer sort key.
- Existing Taiyō seed content and operational services remain coupled.
- TypedSQL generation requires a live PostgreSQL instance.
- Search UI has a server-side fixture fallback; new documents are not yet synced to Meilisearch.
- Authentication, storage upload, and admin publishing are not wired to the new domain.
- E2E, accessibility, and Lighthouse automation remain to be added.
- Upstream migration history still contains the removed `UserSetting` table and
  `HomeLayout` enum; live schema diff reports this pre-existing drift.

## Security, legal, SEO, and design findings

No scraping or external-image proxy is introduced. Demo art is local SVG and
fictional. Legal pages are informational placeholders, not legal advice.
Reader/search routes are noindex, preview robots disallow crawling, and public
pages have canonical/alternate metadata. Theme implementation uses centralized
semantic variables; dynamic per-series accent is deliberately limited.

## Baseline verification

Node 22.23.1 is installed while the repo requires Node 24.11.1. `pnpm` is
available through Corepack. PostgreSQL was started locally; all 25 migrations
applied, TypedSQL generated, Prisma validation passed, web/database typechecks
passed, the fictional platform seed ran, and the Next production bundle compiled.
The Node engine mismatch remains an environment warning.

## Deferred scope

Payments, VIP, comments, OCR/translation pipelines, scraping, recommendation,
offline reading, advanced reader modes, and a full admin panel are intentionally
deferred.
