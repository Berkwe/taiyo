import type { PricingLine, PricingQuote, TranslationQuality } from "./types"

const positiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback
}

export const translationConfig = {
  balancedCredits: positiveInt(process.env.TRANSLATION_BALANCED_CREDITS, 100),
  premiumCredits: positiveInt(process.env.TRANSLATION_PREMIUM_CREDITS, 150),
  maxChapters: positiveInt(process.env.MAX_CHAPTERS_PER_REQUEST, 2_000),
  earlyAccessHours: positiveInt(process.env.CONTRIBUTOR_EARLY_ACCESS_HOURS, 24),
}

export function quoteTranslation(input: {
  chapters: Array<{ id: string; number: string }>
  qualityTier: TranslationQuality
  active?: Record<string, TranslationQuality>
  fundedCredits?: number
}): PricingQuote {
  if (
    input.chapters.length < 1 ||
    input.chapters.length > translationConfig.maxChapters
  )
    throw new Error(
      `Bir talepte en fazla ${translationConfig.maxChapters} bölüm seçilebilir.`,
    )
  const perChapterCredits =
    input.qualityTier === "premium"
      ? translationConfig.premiumCredits
      : translationConfig.balancedCredits
  const lines: PricingLine[] = input.chapters.map((chapter) => {
    const active = input.active?.[chapter.id]
    if (active === "premium")
      return {
        chapterId: chapter.id,
        chapterNumber: chapter.number,
        status: "redundant",
        credits: 0,
        message: "Premium çeviri zaten aktif.",
      }
    if (active === "balanced" && input.qualityTier === "balanced")
      return {
        chapterId: chapter.id,
        chapterNumber: chapter.number,
        status: "active",
        credits: 0,
        message: "Dengeli çeviri zaten aktif.",
      }
    return {
      chapterId: chapter.id,
      chapterNumber: chapter.number,
      status: active === "balanced" ? "upgrade" : "chargeable",
      credits: perChapterCredits,
      ...(active === "balanced"
        ? { message: "Premium yükseltme talebi." }
        : {}),
    }
  })
  const totalCredits = lines.reduce((sum, line) => sum + line.credits, 0)
  const fundedCredits = Math.min(
    totalCredits,
    Math.max(0, input.fundedCredits ?? 0),
  )
  return {
    qualityTier: input.qualityTier,
    outputLanguage: "tr",
    perChapterCredits,
    totalCredits,
    fundedCredits,
    remainingCredits: totalCredits - fundedCredits,
    lines,
  }
}
