export const locales = ["tr", "en"] as const
export type Locale = (typeof locales)[number]

export type SeriesType =
  | "WEBTOON"
  | "MANGA"
  | "MANHWA"
  | "MANHUA"
  | "COMIC"
  | "LIGHT_NOVEL"

export type SeriesStatus = "ONGOING" | "COMPLETED" | "HIATUS"
export type ContentRating = "EVERYONE" | "TEEN" | "MATURE"

export interface LocalizedText {
  title: string
  shortTitle?: string
  description: string
}

export interface TranslationProfile {
  id: string
  slug: string
  labels: Record<Locale, string>
  descriptions: Record<Locale, string>
  sortOrder: number
  isAiGenerated: boolean
  isHumanReviewed: boolean
}

export interface ReleasePage {
  pageNumber: number
  src: string
  width: number
  height: number
  alt: string
}

export interface ChapterRelease {
  id: string
  targetLanguage: Locale
  sourceLanguage: string
  profileId: string
  revision: number
  releaseGroup: string
  publishedAt: string
  humanReviewed: boolean
  glossaryUsed: boolean
  characterMemoryUsed: boolean
  overallQualityScore: number
  isCanonicalForLanguage: boolean
  isIndexable: boolean
  pages: ReleasePage[]
}

export interface Chapter {
  id: string
  number: string
  sortKey: number
  canonicalSlug: string
  localizations: Record<Locale, { title: string; description: string }>
  publishedAt: string
  releases: ChapterRelease[]
}

export interface Series {
  id: string
  slug: string
  originalLanguage: string
  type: SeriesType
  status: SeriesStatus
  contentRating: ContentRating
  publicationYear: number
  updatedAt: string
  publishedAt: string
  accentColor: string
  isFeatured: boolean
  isSearchable: boolean
  isIndexable: boolean
  popularity: number
  localizations: Record<Locale, LocalizedText>
  aliases: string[]
  creators: { name: string; role: string }[]
  genres: string[]
  tags: string[]
  cover: string
  banner?: string
  chapters: Chapter[]
}

export interface ReadingProgress {
  releaseId: string
  chapterId: string
  pageNumber: number
  scrollRatio: number
  updatedAt: string
  completedAt?: string
}

export const isLocale = (value: string): value is Locale =>
  locales.includes(value as Locale)
