UPDATE "TranslationProfile"
SET
  "labelKey" = 'Novora AI Translation',
  "descriptionKey" = 'Novora AI çeviri sistemiyle hazırlanan sürüm',
  "isAiGenerated" = TRUE,
  "isHumanReviewed" = FALSE,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'mandown-download';
