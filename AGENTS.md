# NovoraScans contribution rules

- Feature components use semantic color tokens; do not add raw palette classes or hex colors.
- Prefer Server Components. Add a Client Component only for browser APIs or interaction.
- Every public route needs localized metadata. State the sitemap decision for every new indexable route.
- A new locale requires metadata and hreflang coverage.
- Translated readable content belongs to `ChapterRelease`; do not merge series, chapter metadata, and release concepts.
- Reader routes are `noindex, follow` by default.
- Demo content must be fictional and locally hosted. Preserve upstream licenses.
- Avoid new dependencies unless the current stack cannot meet a concrete requirement.
- Before handoff run format, lint, typecheck, relevant tests, and build; report blockers exactly.
