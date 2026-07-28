CREATE TYPE "CatalogPublicationStatus" AS ENUM ('ONGOING', 'COMPLETED', 'HIATUS');
CREATE TYPE "TranslationCampaignStatus" AS ENUM ('FUNDING', 'FUNDED', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED', 'CANCELLED', 'REFUNDED');
CREATE TYPE "TranslationContributionStatus" AS ENUM ('COMMITTED', 'REFUNDED');
CREATE TYPE "CreditTransactionType" AS ENUM ('PURCHASE', 'CAMPAIGN_CONTRIBUTION', 'CONTRIBUTION_REFUND', 'READING_REWARD', 'AD_REWARD', 'ADMIN_ADJUSTMENT');
CREATE TYPE "CreditTransactionStatus" AS ENUM ('COMMITTED', 'REVERSED');
CREATE TYPE "TranslationJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

ALTER TYPE "RevisionEntityType" ADD VALUE 'TRANSLATION_CAMPAIGN';
ALTER TYPE "RevisionEntityType" ADD VALUE 'CATALOG_SOURCE';
ALTER TYPE "SiteNotificationType" ADD VALUE 'TRANSLATION_CAMPAIGN';
ALTER TABLE "NotificationPreference" ADD COLUMN "translationUpdates" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "CatalogSeries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "providerKey" TEXT NOT NULL,
  "externalSeriesId" TEXT NOT NULL,
  "canonicalKey" TEXT NOT NULL,
  "canonicalSeriesId" UUID,
  "title" TEXT NOT NULL,
  "originalTitle" TEXT NOT NULL,
  "alternativeTitles" TEXT[],
  "description" TEXT NOT NULL,
  "coverPath" TEXT NOT NULL,
  "publicationStatus" "CatalogPublicationStatus" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CatalogSeries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CatalogSourceEdition" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "catalogSeriesId" UUID NOT NULL,
  "externalEditionId" TEXT NOT NULL,
  "backendPlatform" "SourcePlatform" NOT NULL,
  "sourceLanguage" "Languages" NOT NULL,
  "publicSourceLabel" TEXT NOT NULL,
  "publicDescription" TEXT NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "lastUpdatedAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CatalogSourceEdition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CatalogSourceChapter" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "sourceEditionId" UUID NOT NULL,
  "externalChapterId" TEXT NOT NULL,
  "chapterNumber" TEXT NOT NULL,
  "sortKey" INTEGER NOT NULL,
  "title" TEXT,
  "publishedAt" TIMESTAMP(3),
  "isAvailable" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CatalogSourceChapter_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TranslationSourcePreference" (
  "userId" UUID NOT NULL,
  "canonicalKey" TEXT NOT NULL,
  "sourceEditionId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TranslationSourcePreference_pkey" PRIMARY KEY ("userId","canonicalKey")
);

CREATE TABLE "TranslationCampaign" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "catalogSeriesId" TEXT NOT NULL,
  "sourceEditionId" TEXT NOT NULL,
  "sourceLanguage" "Languages" NOT NULL,
  "outputLanguage" "Languages" NOT NULL,
  "qualityTier" "TranslationQualityTier" NOT NULL,
  "targetCredits" INTEGER NOT NULL,
  "fundedCredits" INTEGER NOT NULL DEFAULT 0,
  "status" "TranslationCampaignStatus" NOT NULL DEFAULT 'FUNDING',
  "expiresAt" TIMESTAMP(3),
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "fundedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "publicAt" TIMESTAMP(3),
  "translationJobId" UUID,
  "idempotencyKey" TEXT NOT NULL,
  CONSTRAINT "TranslationCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TranslationCampaignChapter" (
  "campaignId" UUID NOT NULL,
  "sourceChapterId" TEXT NOT NULL,
  "activeKey" TEXT,
  CONSTRAINT "TranslationCampaignChapter_pkey" PRIMARY KEY ("campaignId","sourceChapterId")
);

CREATE TABLE "TranslationContribution" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "campaignId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "credits" INTEGER NOT NULL CHECK ("credits" > 0),
  "status" "TranslationContributionStatus" NOT NULL DEFAULT 'COMMITTED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "refundedAt" TIMESTAMP(3),
  "idempotencyKey" TEXT NOT NULL,
  CONSTRAINT "TranslationContribution_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreditAccount" (
  "userId" UUID NOT NULL,
  "cachedBalance" INTEGER NOT NULL DEFAULT 0 CHECK ("cachedBalance" >= 0),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CreditAccount_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "CreditTransaction" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "amount" INTEGER NOT NULL,
  "type" "CreditTransactionType" NOT NULL,
  "status" "CreditTransactionStatus" NOT NULL DEFAULT 'COMMITTED',
  "referenceType" TEXT,
  "referenceId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TranslationJob" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "campaignId" UUID NOT NULL,
  "status" "TranslationJobStatus" NOT NULL DEFAULT 'QUEUED',
  "provider" TEXT NOT NULL DEFAULT 'mock',
  "payload" JSONB NOT NULL,
  "failureReason" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "TranslationJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CatalogSeries_canonicalKey_isActive_idx" ON "CatalogSeries"("canonicalKey", "isActive");
CREATE UNIQUE INDEX "CatalogSeries_providerKey_externalSeriesId_key" ON "CatalogSeries"("providerKey", "externalSeriesId");
CREATE INDEX "CatalogSourceEdition_catalogSeriesId_sourceLanguage_priorit_idx" ON "CatalogSourceEdition"("catalogSeriesId", "sourceLanguage", "priority");
CREATE UNIQUE INDEX "CatalogSourceEdition_catalogSeriesId_externalEditionId_key" ON "CatalogSourceEdition"("catalogSeriesId", "externalEditionId");
CREATE INDEX "CatalogSourceChapter_sourceEditionId_sortKey_idx" ON "CatalogSourceChapter"("sourceEditionId", "sortKey");
CREATE UNIQUE INDEX "CatalogSourceChapter_sourceEditionId_externalChapterId_key" ON "CatalogSourceChapter"("sourceEditionId", "externalChapterId");
CREATE UNIQUE INDEX "CatalogSourceChapter_sourceEditionId_chapterNumber_key" ON "CatalogSourceChapter"("sourceEditionId", "chapterNumber");
CREATE UNIQUE INDEX "TranslationCampaign_translationJobId_key" ON "TranslationCampaign"("translationJobId");
CREATE UNIQUE INDEX "TranslationCampaign_idempotencyKey_key" ON "TranslationCampaign"("idempotencyKey");
CREATE INDEX "TranslationCampaign_status_createdAt_idx" ON "TranslationCampaign"("status", "createdAt");
CREATE INDEX "TranslationCampaign_catalogSeriesId_sourceEditionId_idx" ON "TranslationCampaign"("catalogSeriesId", "sourceEditionId");
CREATE UNIQUE INDEX "TranslationCampaignChapter_activeKey_key" ON "TranslationCampaignChapter"("activeKey");
CREATE INDEX "TranslationCampaignChapter_sourceChapterId_idx" ON "TranslationCampaignChapter"("sourceChapterId");
CREATE UNIQUE INDEX "TranslationContribution_idempotencyKey_key" ON "TranslationContribution"("idempotencyKey");
CREATE INDEX "TranslationContribution_campaignId_createdAt_idx" ON "TranslationContribution"("campaignId", "createdAt");
CREATE INDEX "TranslationContribution_userId_createdAt_idx" ON "TranslationContribution"("userId", "createdAt");
CREATE UNIQUE INDEX "CreditTransaction_idempotencyKey_key" ON "CreditTransaction"("idempotencyKey");
CREATE INDEX "CreditTransaction_userId_createdAt_idx" ON "CreditTransaction"("userId", "createdAt");
CREATE INDEX "CreditTransaction_referenceType_referenceId_idx" ON "CreditTransaction"("referenceType", "referenceId");
CREATE UNIQUE INDEX "TranslationJob_campaignId_key" ON "TranslationJob"("campaignId");
CREATE UNIQUE INDEX "TranslationJob_idempotencyKey_key" ON "TranslationJob"("idempotencyKey");

ALTER TABLE "CatalogSourceEdition" ADD CONSTRAINT "CatalogSourceEdition_catalogSeriesId_fkey" FOREIGN KEY ("catalogSeriesId") REFERENCES "CatalogSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CatalogSourceChapter" ADD CONSTRAINT "CatalogSourceChapter_sourceEditionId_fkey" FOREIGN KEY ("sourceEditionId") REFERENCES "CatalogSourceEdition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TranslationSourcePreference" ADD CONSTRAINT "TranslationSourcePreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TranslationSourcePreference" ADD CONSTRAINT "TranslationSourcePreference_sourceEditionId_fkey" FOREIGN KEY ("sourceEditionId") REFERENCES "CatalogSourceEdition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TranslationCampaign" ADD CONSTRAINT "TranslationCampaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TranslationCampaignChapter" ADD CONSTRAINT "TranslationCampaignChapter_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "TranslationCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TranslationContribution" ADD CONSTRAINT "TranslationContribution_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "TranslationCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TranslationContribution" ADD CONSTRAINT "TranslationContribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreditAccount" ADD CONSTRAINT "CreditAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TranslationJob" ADD CONSTRAINT "TranslationJob_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "TranslationCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
