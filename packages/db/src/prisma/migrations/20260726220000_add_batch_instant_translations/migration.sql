ALTER TYPE "TranslationCampaignKind" ADD VALUE 'BATCH_INSTANT';

CREATE TYPE "BatchTranslationStatus" AS ENUM (
  'QUEUED',
  'PROCESSING',
  'COMPLETED',
  'PARTIAL_FAILED',
  'FAILED'
);

CREATE TYPE "BatchTranslationItemStatus" AS ENUM (
  'EXCLUDED',
  'QUEUED',
  'PROCESSING',
  'COMPLETED',
  'FAILED'
);

CREATE TABLE "BatchTranslationRequest" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "catalogSeriesId" TEXT NOT NULL,
  "sourceEditionId" TEXT NOT NULL,
  "outputLanguage" "Languages" NOT NULL,
  "qualityTier" "TranslationQualityTier" NOT NULL,
  "status" "BatchTranslationStatus" NOT NULL DEFAULT 'QUEUED',
  "requestedCount" INTEGER NOT NULL,
  "eligibleCount" INTEGER NOT NULL,
  "excludedCount" INTEGER NOT NULL,
  "totalCredits" INTEGER NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "BatchTranslationRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BatchTranslationRequest_counts_nonnegative"
    CHECK (
      "requestedCount" >= 0
      AND "eligibleCount" >= 0
      AND "excludedCount" >= 0
      AND "totalCredits" >= 0
    )
);

CREATE TABLE "BatchTranslationRequestItem" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "batchRequestId" UUID NOT NULL,
  "sourceChapterId" TEXT NOT NULL,
  "chapterNumber" TEXT NOT NULL,
  "status" "BatchTranslationItemStatus" NOT NULL,
  "credits" INTEGER NOT NULL DEFAULT 0,
  "exclusionReason" TEXT,
  "campaignId" UUID,
  "translationJobId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "BatchTranslationRequestItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BatchTranslationRequestItem_credits_nonnegative"
    CHECK ("credits" >= 0)
);

CREATE UNIQUE INDEX "BatchTranslationRequest_idempotencyKey_key"
ON "BatchTranslationRequest"("idempotencyKey");

CREATE INDEX "BatchTranslationRequest_userId_createdAt_idx"
ON "BatchTranslationRequest"("userId", "createdAt");

CREATE INDEX "BatchTranslationRequest_status_createdAt_idx"
ON "BatchTranslationRequest"("status", "createdAt");

CREATE UNIQUE INDEX "BatchTranslationRequestItem_campaignId_key"
ON "BatchTranslationRequestItem"("campaignId");

CREATE UNIQUE INDEX "BatchTranslationRequestItem_translationJobId_key"
ON "BatchTranslationRequestItem"("translationJobId");

CREATE UNIQUE INDEX "BatchTranslationRequestItem_batchRequestId_sourceChapterId_key"
ON "BatchTranslationRequestItem"("batchRequestId", "sourceChapterId");

CREATE INDEX "BatchTranslationRequestItem_batchRequestId_status_idx"
ON "BatchTranslationRequestItem"("batchRequestId", "status");

ALTER TABLE "BatchTranslationRequest"
ADD CONSTRAINT "BatchTranslationRequest_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BatchTranslationRequestItem"
ADD CONSTRAINT "BatchTranslationRequestItem_batchRequestId_fkey"
FOREIGN KEY ("batchRequestId") REFERENCES "BatchTranslationRequest"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BatchTranslationRequestItem"
ADD CONSTRAINT "BatchTranslationRequestItem_campaignId_fkey"
FOREIGN KEY ("campaignId") REFERENCES "TranslationCampaign"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BatchTranslationRequestItem"
ADD CONSTRAINT "BatchTranslationRequestItem_translationJobId_fkey"
FOREIGN KEY ("translationJobId") REFERENCES "TranslationJob"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
