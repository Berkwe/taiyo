# Data model

- `Series`: language-independent identity, stable slug, format, status, rating,
  publication flags, and accent.
- `SeriesLocalization` and `SeriesAlias`: locale-specific presentation and
  searchable names.
- `PlatformCreator`, `Genre`, and `PlatformTag`: normalized, localizable
  taxonomy connected by explicit join tables.
- `PlatformChapter`: exact string chapter/volume numbers and an integer sort key,
  avoiding floating-point identity errors.
- `ChapterLocalization`: localized chapter metadata, not translated pages.
- `TranslationProfile`: ordered user-facing quality definition.
- `ReleaseGroup`: the organization responsible for an edition.
- `ChapterRelease`: target/source language, profile, revision, workflow,
  provenance, quality metrics, and canonical/public/indexable flags.
- `ReleasePage`: unique ordered page with dimensions and asset integrity data.
- `ReadingProgressRecord`: future signed-in progress; anonymous progress stays
  in localStorage.
- `SlugRedirect`: old localized slug mapping.

The new tables are additive. Legacy `Media` and `Chapter` remain untouched until
a measured backfill and cutover plan is approved.
