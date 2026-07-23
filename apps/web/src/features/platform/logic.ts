import type {
  Locale,
  ReadingProgress,
  Series,
  TranslationProfile,
} from "./domain"

export const compareChapterNumbers = (left: string, right: string) =>
  Number.parseFloat(left) - Number.parseFloat(right)

export const localized = <T>(
  values: Partial<Record<Locale, T>>,
  locale: Locale,
  fallback: Locale = "tr",
) => values[locale] ?? values[fallback] ?? values.en

export const sortProfiles = (profiles: TranslationProfile[]) =>
  [...profiles].sort((left, right) => left.sortOrder - right.sortOrder)

export const parseReadingProgress = (
  value: string | null,
): ReadingProgress | null => {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as Partial<ReadingProgress>
    if (
      typeof parsed.releaseId !== "string" ||
      typeof parsed.chapterId !== "string" ||
      !Number.isInteger(parsed.pageNumber) ||
      typeof parsed.scrollRatio !== "number" ||
      parsed.scrollRatio < 0 ||
      parsed.scrollRatio > 1 ||
      typeof parsed.updatedAt !== "string"
    ) {
      return null
    }
    return parsed as ReadingProgress
  } catch {
    return null
  }
}

export const toSearchDocument = (series: Series) => ({
  id: series.id,
  slug: series.slug,
  titles: Object.values(series.localizations).map((value) => value.title),
  aliases: series.aliases,
  creators: series.creators.map((creator) => creator.name),
  genres: series.genres,
  tags: series.tags,
  type: series.type,
  status: series.status,
  languages: [
    ...new Set(
      series.chapters.flatMap((chapter) =>
        chapter.releases.map((release) => release.targetLanguage),
      ),
    ),
  ],
  updatedAt: series.updatedAt,
  popularity: series.popularity,
})
