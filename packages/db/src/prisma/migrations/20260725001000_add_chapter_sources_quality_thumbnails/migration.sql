CREATE TYPE "SourcePlatform" AS ENUM ('NAVER', 'WEBTOONS', 'KAKAO', 'OTHER');
CREATE TYPE "TranslationQualityTier" AS ENUM ('BALANCED', 'PREMIUM');

ALTER TABLE "PlatformChapter"
  ADD COLUMN "thumbnailStorageKey" TEXT;

CREATE TABLE "ChapterSource" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "platform" "SourcePlatform" NOT NULL,
  "language" "Languages" NOT NULL,
  "displayLabel" TEXT,
  "description" TEXT NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "sourceUrl" TEXT,
  "externalId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "chapterId" UUID NOT NULL,
  CONSTRAINT "ChapterSource_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ChapterRelease"
  ADD COLUMN "sourceId" UUID,
  ADD COLUMN "qualityTier" "TranslationQualityTier" NOT NULL DEFAULT 'BALANCED',
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "pipelineVersion" TEXT;

CREATE INDEX "ChapterSource_chapterId_language_isActive_priority_idx"
  ON "ChapterSource"("chapterId", "language", "isActive", "priority");
CREATE INDEX "ChapterSource_platform_externalId_idx"
  ON "ChapterSource"("platform", "externalId");
CREATE INDEX "ChapterRelease_sourceId_targetLanguage_isActive_idx"
  ON "ChapterRelease"("sourceId", "targetLanguage", "isActive");

ALTER TABLE "ChapterSource"
  ADD CONSTRAINT "ChapterSource_chapterId_fkey"
  FOREIGN KEY ("chapterId") REFERENCES "PlatformChapter"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChapterRelease"
  ADD CONSTRAINT "ChapterRelease_sourceId_fkey"
  FOREIGN KEY ("sourceId") REFERENCES "ChapterSource"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
