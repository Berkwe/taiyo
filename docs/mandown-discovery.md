# Mandown source discovery in Novora

Novora pins Mandown to `ac2a7a466dfbb3fc4047165a46ffbbe68e6876b5`.
Title searches stay AniList-only. After a signed selection is verified,
`selectSeries()` calls the Python bridge's `search-sources` command, which delegates
to `mandown.search_sources()` with its defaults (54% threshold, three candidates
per phase). Accepted links merge with existing direct links using Novora's existing
provider, language, priority, duplicate and fallback rules. MangaDex can discover
missing sources; WEBTOON/Naver remain external-link-only in this Mandown revision.

Partial/failed discovery retains known sources and does not deactivate missing
catalog editions. Existing chapter hydration (15-minute refresh), downloads,
CBZ import, `ChapterRelease`, adult/source filters and reader behavior stay intact.
No routes, locales, sitemap entries or database migrations are added.

## Server configuration

- `MANDOWN_JEV_CACHE=storage/mandown/jev.sqlite3`: persistent score database; `off`
  disables it. Relative paths resolve against the workspace root.
- `MANDOWN_JEV_CACHE_REVISION=1`: increment after an upstream model update.
- `MANDOWN_SEARCH_LOG=storage/mandown/search.jsonl`: local, redacted diagnostics.
- `JEVMODEL_API_KEY`: server-only; needed for uncached uncertain comparisons.
  Mandown also reads its documented fallback-key environment variables.

Mandown owns all cache logic. Successful positive/negative scores live for 30 days.
A hit requires matching comparison inputs/prompt/model/revision, works without a
key, and reevaluates the saved probability against the requested threshold.
Source searches and metadata requests still run. No remote seed is fetched.
Runtime files remain under Git-ignored storage; do not put keys in client variables.
Use Python 3.10–3.13 for the pinned Mandown package.

## Verification and rollback

`pnpm test:mandown-discovery` runs offline bridge/cache and catalog merge tests.
It includes a real Python service/resolver/cache with locally mocked HTTP,
keyless cache reads after process restart, four source-pair reuse, changed input
and revision invalidation, and partial-result persistence checks.

Before integration, source (including local edits and private local settings),
build and Python environment snapshots are stored under `backups/` with a hash
manifest. The generated `ROLLBACK.sh /absolute/workspace/path` restores these
snapshots and removes files added by this integration. It does not restore user
storage or database contents. Restart the existing app process after restoring.
The verification report records the original build ID and exact test/build results.
