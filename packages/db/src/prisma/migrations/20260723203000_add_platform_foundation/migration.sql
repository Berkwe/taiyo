CREATE TYPE "SeriesType" AS ENUM ('WEBTOON', 'MANGA', 'MANHWA', 'MANHUA', 'COMIC', 'LIGHT_NOVEL');
CREATE TYPE "SeriesStatus" AS ENUM ('ONGOING', 'COMPLETED', 'HIATUS', 'ANNOUNCED', 'CANCELLED');
CREATE TYPE "PlatformContentRating" AS ENUM ('EVERYONE', 'TEEN', 'MATURE');
CREATE TYPE "SeriesAliasType" AS ENUM ('ORIGINAL', 'ROMANIZED', 'ENGLISH', 'TURKISH', 'ALTERNATIVE', 'FORMER_TITLE');
CREATE TYPE "CreatorRole" AS ENUM ('AUTHOR', 'ARTIST', 'WRITER', 'COLORIST', 'STUDIO');
CREATE TYPE "ReleaseGroupType" AS ENUM ('OFFICIAL', 'INTERNAL', 'COMMUNITY', 'PARTNER');
CREATE TYPE "ReleaseStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "SlugEntityType" AS ENUM ('SERIES', 'CHAPTER', 'GENRE', 'CREATOR');

CREATE TABLE "Series" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "slug" TEXT NOT NULL,
  "originalLanguage" "Languages" NOT NULL, "type" "SeriesType" NOT NULL,
  "status" "SeriesStatus" NOT NULL, "contentRating" "PlatformContentRating" NOT NULL DEFAULT 'TEEN',
  "publicationYear" INTEGER, "defaultAccentColor" TEXT, "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "isSearchable" BOOLEAN NOT NULL DEFAULT true, "isIndexable" BOOLEAN NOT NULL DEFAULT true,
  "publishedAt" TIMESTAMP(3), "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Series_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SeriesLocalization" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "locale" "Languages" NOT NULL,
  "title" TEXT NOT NULL, "shortTitle" TEXT, "description" TEXT NOT NULL,
  "seoTitleOverride" TEXT, "seoDescriptionOverride" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  "seriesId" UUID NOT NULL, CONSTRAINT "SeriesLocalization_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SeriesAlias" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "locale" "Languages", "alias" TEXT NOT NULL,
  "normalizedAlias" TEXT NOT NULL, "type" "SeriesAliasType" NOT NULL DEFAULT 'ALTERNATIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "seriesId" UUID NOT NULL,
  CONSTRAINT "SeriesAlias_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PlatformCreator" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "slug" TEXT NOT NULL, "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlatformCreator_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SeriesCreator" (
  "role" "CreatorRole" NOT NULL, "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "seriesId" UUID NOT NULL, "creatorId" UUID NOT NULL,
  CONSTRAINT "SeriesCreator_pkey" PRIMARY KEY ("seriesId","creatorId","role")
);
CREATE TABLE "Genre" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "slug" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Genre_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "GenreLocalization" (
  "locale" "Languages" NOT NULL, "name" TEXT NOT NULL, "genreId" UUID NOT NULL,
  CONSTRAINT "GenreLocalization_pkey" PRIMARY KEY ("genreId","locale")
);
CREATE TABLE "SeriesGenre" (
  "sortOrder" INTEGER NOT NULL DEFAULT 0, "seriesId" UUID NOT NULL, "genreId" UUID NOT NULL,
  CONSTRAINT "SeriesGenre_pkey" PRIMARY KEY ("seriesId","genreId")
);
CREATE TABLE "PlatformTag" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "slug" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlatformTag_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "TagLocalization" (
  "locale" "Languages" NOT NULL, "name" TEXT NOT NULL, "tagId" UUID NOT NULL,
  CONSTRAINT "TagLocalization_pkey" PRIMARY KEY ("tagId","locale")
);
CREATE TABLE "SeriesTag" (
  "seriesId" UUID NOT NULL, "tagId" UUID NOT NULL,
  CONSTRAINT "SeriesTag_pkey" PRIMARY KEY ("seriesId","tagId")
);
CREATE TABLE "PlatformChapter" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "chapterNumber" TEXT NOT NULL,
  "volumeNumber" TEXT, "sortKey" INTEGER NOT NULL, "canonicalSlug" TEXT NOT NULL,
  "originalPublishedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, "deletedAt" TIMESTAMP(3), "seriesId" UUID NOT NULL,
  CONSTRAINT "PlatformChapter_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ChapterLocalization" (
  "locale" "Languages" NOT NULL, "title" TEXT, "description" TEXT, "chapterId" UUID NOT NULL,
  CONSTRAINT "ChapterLocalization_pkey" PRIMARY KEY ("chapterId","locale")
);
CREATE TABLE "TranslationProfile" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "slug" TEXT NOT NULL, "labelKey" TEXT NOT NULL,
  "descriptionKey" TEXT NOT NULL, "sortOrder" INTEGER NOT NULL, "badgeStyle" TEXT,
  "isAiGenerated" BOOLEAN NOT NULL DEFAULT false, "isHumanReviewed" BOOLEAN NOT NULL DEFAULT false,
  "glossaryEnabled" BOOLEAN NOT NULL DEFAULT false, "characterMemoryEnabled" BOOLEAN NOT NULL DEFAULT false,
  "isPublic" BOOLEAN NOT NULL DEFAULT true, "isIndexable" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TranslationProfile_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ReleaseGroup" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "slug" TEXT NOT NULL, "name" TEXT NOT NULL,
  "description" TEXT, "website" TEXT, "verified" BOOLEAN NOT NULL DEFAULT false,
  "type" "ReleaseGroupType" NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "ReleaseGroup_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ChapterRelease" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "targetLanguage" "Languages" NOT NULL,
  "sourceLanguage" "Languages" NOT NULL, "revision" INTEGER NOT NULL DEFAULT 1,
  "status" "ReleaseStatus" NOT NULL DEFAULT 'DRAFT', "publishedAt" TIMESTAMP(3),
  "humanReviewed" BOOLEAN NOT NULL DEFAULT false, "glossaryUsed" BOOLEAN NOT NULL DEFAULT false,
  "characterMemoryUsed" BOOLEAN NOT NULL DEFAULT false, "translationQualityScore" INTEGER,
  "ocrQualityScore" INTEGER, "cleanupQualityScore" INTEGER, "overallQualityScore" INTEGER,
  "internalEngineName" TEXT, "internalEngineVersion" TEXT, "pageCount" INTEGER NOT NULL DEFAULT 0,
  "storagePrefix" TEXT, "isCanonicalForLanguage" BOOLEAN NOT NULL DEFAULT false,
  "isPublic" BOOLEAN NOT NULL DEFAULT false, "isIndexable" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  "chapterId" UUID NOT NULL, "translationProfileId" UUID NOT NULL, "releaseGroupId" UUID,
  CONSTRAINT "ChapterRelease_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ReleasePage" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "pageNumber" INTEGER NOT NULL, "assetUrl" TEXT NOT NULL,
  "width" INTEGER NOT NULL, "height" INTEGER NOT NULL, "blurData" TEXT, "mimeType" TEXT NOT NULL,
  "fileSize" BIGINT, "checksum" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "releaseId" UUID NOT NULL, CONSTRAINT "ReleasePage_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ReadingProgressRecord" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "userId" UUID NOT NULL, "chapterId" UUID NOT NULL,
  "pageNumber" INTEGER NOT NULL, "scrollRatio" DOUBLE PRECISION NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3), "releaseId" UUID NOT NULL,
  CONSTRAINT "ReadingProgressRecord_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SlugRedirect" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "entityType" "SlugEntityType" NOT NULL,
  "entityId" UUID NOT NULL, "oldSlug" TEXT NOT NULL, "locale" "Languages",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SlugRedirect_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Series_slug_key" ON "Series"("slug");
CREATE INDEX "Series_status_isSearchable_deletedAt_idx" ON "Series"("status","isSearchable","deletedAt");
CREATE INDEX "Series_isFeatured_publishedAt_idx" ON "Series"("isFeatured","publishedAt");
CREATE UNIQUE INDEX "SeriesLocalization_seriesId_locale_key" ON "SeriesLocalization"("seriesId","locale");
CREATE INDEX "SeriesLocalization_locale_title_idx" ON "SeriesLocalization"("locale","title");
CREATE UNIQUE INDEX "SeriesAlias_seriesId_locale_normalizedAlias_key" ON "SeriesAlias"("seriesId","locale","normalizedAlias");
CREATE INDEX "SeriesAlias_normalizedAlias_idx" ON "SeriesAlias"("normalizedAlias");
CREATE UNIQUE INDEX "PlatformCreator_slug_key" ON "PlatformCreator"("slug");
CREATE UNIQUE INDEX "Genre_slug_key" ON "Genre"("slug");
CREATE UNIQUE INDEX "GenreLocalization_locale_name_key" ON "GenreLocalization"("locale","name");
CREATE UNIQUE INDEX "PlatformTag_slug_key" ON "PlatformTag"("slug");
CREATE UNIQUE INDEX "TagLocalization_locale_name_key" ON "TagLocalization"("locale","name");
CREATE UNIQUE INDEX "PlatformChapter_seriesId_chapterNumber_key" ON "PlatformChapter"("seriesId","chapterNumber");
CREATE UNIQUE INDEX "PlatformChapter_seriesId_canonicalSlug_key" ON "PlatformChapter"("seriesId","canonicalSlug");
CREATE INDEX "PlatformChapter_seriesId_sortKey_idx" ON "PlatformChapter"("seriesId","sortKey");
CREATE UNIQUE INDEX "TranslationProfile_slug_key" ON "TranslationProfile"("slug");
CREATE INDEX "TranslationProfile_isPublic_sortOrder_idx" ON "TranslationProfile"("isPublic","sortOrder");
CREATE UNIQUE INDEX "ReleaseGroup_slug_key" ON "ReleaseGroup"("slug");
CREATE UNIQUE INDEX "ChapterRelease_chapterId_targetLanguage_translationProfileId_revision_key" ON "ChapterRelease"("chapterId","targetLanguage","translationProfileId","revision");
CREATE INDEX "ChapterRelease_chapterId_targetLanguage_isPublic_publishedAt_idx" ON "ChapterRelease"("chapterId","targetLanguage","isPublic","publishedAt");
CREATE UNIQUE INDEX "ReleasePage_releaseId_pageNumber_key" ON "ReleasePage"("releaseId","pageNumber");
CREATE UNIQUE INDEX "ReadingProgressRecord_userId_releaseId_key" ON "ReadingProgressRecord"("userId","releaseId");
CREATE INDEX "ReadingProgressRecord_userId_updatedAt_idx" ON "ReadingProgressRecord"("userId","updatedAt");
CREATE UNIQUE INDEX "SlugRedirect_entityType_oldSlug_locale_key" ON "SlugRedirect"("entityType","oldSlug","locale");
CREATE INDEX "SlugRedirect_entityType_entityId_idx" ON "SlugRedirect"("entityType","entityId");

ALTER TABLE "SeriesLocalization" ADD CONSTRAINT "SeriesLocalization_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SeriesAlias" ADD CONSTRAINT "SeriesAlias_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SeriesCreator" ADD CONSTRAINT "SeriesCreator_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SeriesCreator" ADD CONSTRAINT "SeriesCreator_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "PlatformCreator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GenreLocalization" ADD CONSTRAINT "GenreLocalization_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "Genre"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SeriesGenre" ADD CONSTRAINT "SeriesGenre_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SeriesGenre" ADD CONSTRAINT "SeriesGenre_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "Genre"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TagLocalization" ADD CONSTRAINT "TagLocalization_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "PlatformTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SeriesTag" ADD CONSTRAINT "SeriesTag_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SeriesTag" ADD CONSTRAINT "SeriesTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "PlatformTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlatformChapter" ADD CONSTRAINT "PlatformChapter_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChapterLocalization" ADD CONSTRAINT "ChapterLocalization_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "PlatformChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChapterRelease" ADD CONSTRAINT "ChapterRelease_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "PlatformChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChapterRelease" ADD CONSTRAINT "ChapterRelease_translationProfileId_fkey" FOREIGN KEY ("translationProfileId") REFERENCES "TranslationProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ChapterRelease" ADD CONSTRAINT "ChapterRelease_releaseGroupId_fkey" FOREIGN KEY ("releaseGroupId") REFERENCES "ReleaseGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReleasePage" ADD CONSTRAINT "ReleasePage_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "ChapterRelease"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReadingProgressRecord" ADD CONSTRAINT "ReadingProgressRecord_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "ChapterRelease"("id") ON DELETE CASCADE ON UPDATE CASCADE;
