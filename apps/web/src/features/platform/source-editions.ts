import type {
  Chapter,
  ChapterRelease,
  Locale,
  PublicChapterSource,
  TranslationQualityTier,
  TranslationType,
} from "./domain"

const languageNames: Record<Locale, Record<string, string>> = {
  tr: {
    de: "Almanca",
    en: "İngilizce",
    ja: "Japonca",
    ko: "Korece",
    tr: "Türkçe",
    zh: "Çince",
  },
  en: {
    de: "German",
    en: "English",
    ja: "Japanese",
    ko: "Korean",
    tr: "Turkish",
    zh: "Chinese",
  },
}

export const sourcePreferenceKey = (seriesSlug: string) =>
  `novora:series-source:${seriesSlug}`

export function distinctSources(chapter: Chapter) {
  const sources = new Map<string, PublicChapterSource>()
  for (const release of chapter.releases) {
    if (release.isActive) sources.set(release.source.id, release.source)
  }
  return [...sources.values()].sort(
    (left, right) =>
      Number(right.isDefault) - Number(left.isDefault) ||
      right.priority - left.priority ||
      left.id.localeCompare(right.id),
  )
}

export function anonymousSourceLabel(
  source: PublicChapterSource,
  sources: PublicChapterSource[],
  locale: Locale,
) {
  if (source.displayLabel?.trim()) return source.displayLabel.trim()
  const sameLanguage = sources
    .filter((item) => item.sourceLanguage === source.sourceLanguage)
    .sort(
      (left, right) =>
        Number(right.isDefault) - Number(left.isDefault) ||
        right.priority - left.priority ||
        left.id.localeCompare(right.id),
    )
  const number = Math.max(
    1,
    sameLanguage.findIndex((item) => item.id === source.id) + 1,
  )
  const language =
    languageNames[locale][source.sourceLanguage] ??
    source.sourceLanguage.toLocaleUpperCase("en")
  return `${language}-${number}`
}

export function sourcePreferenceToken(
  source: PublicChapterSource,
  sources: PublicChapterSource[],
) {
  const sameLanguage = sources
    .filter((item) => item.sourceLanguage === source.sourceLanguage)
    .sort(
      (left, right) =>
        Number(right.isDefault) - Number(left.isDefault) ||
        right.priority - left.priority ||
        left.id.localeCompare(right.id),
    )
  return `${source.sourceLanguage}:${Math.max(
    1,
    sameLanguage.findIndex((item) => item.id === source.id) + 1,
  )}`
}

function tierRank(tier: TranslationQualityTier) {
  return tier === "premium" ? 2 : 1
}

export function activeReleaseForSource(
  chapter: Chapter,
  sourceId: string,
  outputLanguage: Locale,
) {
  return chapter.releases
    .filter(
      (release) =>
        release.isActive &&
        release.source.id === sourceId &&
        release.targetLanguage === outputLanguage,
    )
    .sort(
      (left, right) =>
        tierRank(right.qualityTier) - tierRank(left.qualityTier) ||
        right.revision - left.revision,
    )[0]
}

export function selectDefaultRelease(
  chapter: Chapter,
  outputLanguage: Locale,
  preferredSourceId?: string | null,
) {
  const sources = distinctSources(chapter)
  const ranked = [...sources].sort(
    (left, right) =>
      Number(
        left.id !== preferredSourceId &&
          sourcePreferenceToken(left, sources) !== preferredSourceId,
      ) -
        Number(
          right.id !== preferredSourceId &&
            sourcePreferenceToken(right, sources) !== preferredSourceId,
        ) ||
      Number(right.sourceLanguage === "en") -
        Number(left.sourceLanguage === "en") ||
      Number(right.isDefault) - Number(left.isDefault) ||
      right.priority - left.priority ||
      left.id.localeCompare(right.id),
  )
  for (const source of ranked) {
    const release = activeReleaseForSource(chapter, source.id, outputLanguage)
    if (release) return release
  }
  return undefined
}

export function chapterThumbnail(chapter: Chapter, seriesCover?: string) {
  if (chapter.thumbnail) return chapter.thumbnail
  const firstPanel = chapter.releases
    .filter((release) => release.isActive)
    .flatMap((release) => release.pages)
    .sort((left, right) => left.pageNumber - right.pageNumber)[0]?.src
  return firstPanel ?? seriesCover ?? null
}

export function qualityLabel(tier: TranslationQualityTier, locale: Locale) {
  if (tier === "premium") return locale === "tr" ? "Premium" : "Premium"
  return locale === "tr" ? "Dengeli" : "Balanced"
}

export function translationTypeLabel(type: TranslationType, locale: Locale) {
  if (type === "ai") return locale === "tr" ? "AI çeviri" : "AI translation"
  if (type === "human")
    return locale === "tr" ? "İnsan eli" : "Human translation"
  return locale === "tr" ? "Bilinmeyen" : "Unknown"
}

export function releaseSourceLabel(
  chapter: Chapter,
  release: ChapterRelease,
  locale: Locale,
) {
  return anonymousSourceLabel(release.source, distinctSources(chapter), locale)
}
