import type { Languages } from "@taiyomoe/db"

export type CatalogLanguage = Languages
export type OutputLanguage = "tr"
export type TranslationQuality = "balanced" | "premium"
export type CatalogSourceProvider =
  | "mangadex"
  | "webtoons"
  | "naver"
  | "naver_series"

export const outputLanguages = [
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
] as const

export function resolveOutputLanguage(
  preferredLanguage: unknown,
): OutputLanguage {
  return preferredLanguage === "tr" ? preferredLanguage : "tr"
}

export interface CatalogChapter {
  id: string
  externalChapterId: string
  number: string
  sortKey: number
  title?: string
  publishedAt?: string
}

export interface PublicSourceEdition {
  id: string
  publicSourceLabel: string
  sourceLanguage: CatalogLanguage
  sourceLanguageLabel: string
  provider: CatalogSourceProvider
  providerLabel: string
  accessStatus: "available" | "paid-account-required"
  description: string
  chapterCount: number
  lastChapterNumber: string
  lastUpdatedAt?: string
  priority: number
  chaptersLoaded: boolean
  chapters: CatalogChapter[]
}

type SourceAccessPriority = Pick<
  PublicSourceEdition,
  "accessStatus" | "priority"
>

export function orderSourceEditionsByAccess<T extends SourceAccessPriority>(
  editions: readonly T[],
) {
  return [...editions].sort((left, right) => {
    const access =
      Number(left.accessStatus === "paid-account-required") -
      Number(right.accessStatus === "paid-account-required")
    return access || right.priority - left.priority
  })
}

export function sourceEditionHydrationTiers<
  T extends Pick<PublicSourceEdition, "accessStatus">,
>(editions: readonly T[]) {
  return [
    editions.filter((edition) => edition.accessStatus === "available"),
    editions.filter(
      (edition) => edition.accessStatus === "paid-account-required",
    ),
  ] as const
}

export interface AniListCatalogSearchItem {
  anilistId: number
  selectionToken: string
  title: {
    english: string | null
    romaji: string | null
    native: string | null
  }
  synonyms: string[]
  cover: string | null
  publicationStatus: string | null
  format: string | null
}

export interface PublicCatalogSeries {
  id: string
  canonicalKey: string
  canonicalSeriesId?: string
  title: string
  originalTitle: string
  alternativeTitles: string[]
  description: string
  cover: string
  publicationStatus: "ongoing" | "completed" | "hiatus"
  editions: PublicSourceEdition[]
}

export interface SourceCatalogProvider {
  searchSeries(
    query: string,
    options?: { includeAdult?: boolean; onlyWithSources?: boolean },
  ): Promise<AniListCatalogSearchItem[]>
  selectSeries(selectionToken: string): Promise<PublicCatalogSeries>
  getSeriesDetails(catalogSeriesId: string): Promise<PublicCatalogSeries | null>
  getSourceEditionDetails(
    sourceEditionId: string,
  ): Promise<PublicSourceEdition | null>
  listSourceEditions(catalogSeriesId: string): Promise<PublicSourceEdition[]>
  listSourceChapters(sourceEditionId: string): Promise<CatalogChapter[]>
  refreshSourceEdition(sourceEditionId: string): Promise<void>
}

export interface PricingLine {
  chapterId: string
  chapterNumber: string
  status: "chargeable" | "active" | "upgrade" | "redundant"
  credits: number
  message?: string
}

export interface PricingQuote {
  qualityTier: TranslationQuality
  outputLanguage: OutputLanguage
  perChapterCredits: number
  totalCredits: number
  fundedCredits: number
  remainingCredits: number
  lines: PricingLine[]
}

export interface ExistingTranslation {
  chapterId: string
  chapterNumber: string
  qualityTier: TranslationQuality
}

export interface TranslationRequestConflict {
  campaignId: string
  campaignKind: "community" | "instant"
  chapterIds: string[]
  chapterNumbers: string[]
  qualityTier: TranslationQuality
  outputLanguage: OutputLanguage
  sourceEditionId: string
  sourceLabel: string
  sameSource: boolean
  sameSettings: boolean
  targetCredits: number
  fundedCredits: number
  remainingCredits: number
}
