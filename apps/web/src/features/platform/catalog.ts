import type { Locale, Series } from "./domain"
import { seriesFixtures, translationProfiles } from "./fixtures"
import { slugify } from "./paths"

export interface CatalogFilters {
  q?: string
  type?: string
  status?: string
  genre?: string
  language?: string
  profile?: string
  sort?: "updated" | "popular"
}

export const filterSeries = (
  input: Series[],
  filters: CatalogFilters,
  locale: Locale,
) => {
  const query = filters.q?.trim().toLocaleLowerCase(locale)
  return input
    .filter((series) => {
      const searchable = [
        series.localizations[locale].title,
        series.localizations.en.title,
        ...series.aliases,
        ...series.genres,
        ...series.tags,
        ...series.creators.map((creator) => creator.name),
      ]
        .join(" ")
        .toLocaleLowerCase(locale)
      return (
        (!query || searchable.includes(query)) &&
        (!filters.type || series.type === filters.type) &&
        (!filters.status || series.status === filters.status) &&
        (!filters.genre ||
          series.genres.some((genre) => slugify(genre) === filters.genre)) &&
        (!filters.language ||
          series.chapters.some((chapter) =>
            chapter.releases.some(
              (release) => release.targetLanguage === filters.language,
            ),
          )) &&
        (!filters.profile ||
          series.chapters.some((chapter) =>
            chapter.releases.some(
              (release) =>
                translationProfiles.find(
                  (profile) => profile.id === release.profileId,
                )?.slug === filters.profile,
            ),
          ))
      )
    })
    .sort((a, b) =>
      filters.sort === "updated"
        ? b.updatedAt.localeCompare(a.updatedAt)
        : b.popularity - a.popularity,
    )
}

export const publicSeries = seriesFixtures.filter(
  (series) => series.isIndexable && series.isSearchable,
)
