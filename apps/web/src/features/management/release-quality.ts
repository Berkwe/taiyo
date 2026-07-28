export interface QualityActivationInput {
  id: string
  sourceId: string | null
  targetLanguage: string
  qualityTier: "BALANCED" | "PREMIUM"
}

export async function enforceQualityActivation(
  release: QualityActivationInput,
  operations: {
    archiveOtherActive: () => Promise<void>
    hasOtherActivePremium: () => Promise<boolean>
  },
) {
  if (!release.sourceId) return
  if (release.qualityTier === "PREMIUM") {
    await operations.archiveOtherActive()
    return
  }
  if (await operations.hasOtherActivePremium()) {
    throw new Error(
      "Bu kaynak ve çıktı dili için Premium sürüm zaten etkin. Dengeli sürüm yeniden etkinleştirilemez.",
    )
  }
}
