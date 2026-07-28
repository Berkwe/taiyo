INSERT INTO "ChapterSource" (
  "id",
  "platform",
  "language",
  "displayLabel",
  "description",
  "priority",
  "isDefault",
  "isActive",
  "createdAt",
  "updatedAt",
  "chapterId"
)
SELECT
  gen_random_uuid(),
  'OTHER'::"SourcePlatform",
  release."sourceLanguage",
  NULL,
  CASE release."sourceLanguage"::text
    WHEN 'en' THEN 'Kaliteli İngilizce kaynak.'
    WHEN 'ko' THEN 'Doğrudan Korece kaynak.'
    ELSE 'Bölümün mevcut kaynak sürümü.'
  END,
  CASE WHEN release."sourceLanguage"::text = 'en' THEN 100 ELSE 50 END,
  CASE WHEN release."sourceLanguage"::text = 'en' THEN true ELSE false END,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  release."chapterId"
FROM "ChapterRelease" AS release
WHERE release."sourceId" IS NULL
GROUP BY release."chapterId", release."sourceLanguage";

UPDATE "ChapterRelease" AS release
SET "sourceId" = source."id"
FROM "ChapterSource" AS source
WHERE release."sourceId" IS NULL
  AND source."chapterId" = release."chapterId"
  AND source."language" = release."sourceLanguage";
