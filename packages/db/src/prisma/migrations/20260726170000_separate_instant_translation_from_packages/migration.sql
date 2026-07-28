CREATE TYPE "TranslationCampaignKind" AS ENUM ('COMMUNITY_PACKAGE', 'INSTANT');
CREATE TYPE "TranslationCampaignChapterStatus" AS ENUM ('PENDING', 'COMPLETED', 'COMPLETED_EXTERNALLY');

ALTER TABLE "TranslationCampaign"
ADD COLUMN "kind" "TranslationCampaignKind" NOT NULL DEFAULT 'COMMUNITY_PACKAGE';

ALTER TABLE "TranslationCampaignChapter"
ADD COLUMN "allocatedCredits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "status" "TranslationCampaignChapterStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "externalTranslationJobId" UUID,
ADD COLUMN "externalPreviousActiveKey" TEXT,
ADD COLUMN "externalPreviousCampaignStatus" "TranslationCampaignStatus",
ADD COLUMN "completedAt" TIMESTAMP(3);

ALTER TABLE "TranslationContribution"
ADD COLUMN "refundedCredits" INTEGER NOT NULL DEFAULT 0;

WITH chapter_allocations AS (
  SELECT
    chapter."campaignId",
    chapter."sourceChapterId",
    FLOOR(campaign."targetCredits"::numeric / NULLIF(COUNT(*) OVER (PARTITION BY chapter."campaignId"), 0))::integer AS allocation,
    ROW_NUMBER() OVER (PARTITION BY chapter."campaignId" ORDER BY chapter."sourceChapterId") AS position
  FROM "TranslationCampaignChapter" chapter
  JOIN "TranslationCampaign" campaign ON campaign."id" = chapter."campaignId"
)
UPDATE "TranslationCampaignChapter" chapter
SET "allocatedCredits" =
  allocations.allocation +
  CASE
    WHEN allocations.position = 1 THEN campaign."targetCredits" - (
      allocations.allocation * (
        SELECT COUNT(*)
        FROM "TranslationCampaignChapter" sibling
        WHERE sibling."campaignId" = chapter."campaignId"
      )
    )
    ELSE 0
  END
FROM chapter_allocations allocations, "TranslationCampaign" campaign
WHERE chapter."campaignId" = allocations."campaignId"
  AND chapter."sourceChapterId" = allocations."sourceChapterId"
  AND campaign."id" = chapter."campaignId";

CREATE TABLE "TranslationEarlyAccessGrant" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "sourceChapterId" TEXT NOT NULL,
  "translationJobId" UUID NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TranslationEarlyAccessGrant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TranslationCampaignChapter_externalTranslationJobId_key"
ON "TranslationCampaignChapter"("externalTranslationJobId");

CREATE UNIQUE INDEX "TranslationEarlyAccessGrant_userId_sourceChapterId_translationJobId_key"
ON "TranslationEarlyAccessGrant"("userId", "sourceChapterId", "translationJobId");

CREATE INDEX "TranslationEarlyAccessGrant_userId_expiresAt_idx"
ON "TranslationEarlyAccessGrant"("userId", "expiresAt");

CREATE INDEX "TranslationEarlyAccessGrant_sourceChapterId_expiresAt_idx"
ON "TranslationEarlyAccessGrant"("sourceChapterId", "expiresAt");

ALTER TABLE "TranslationCampaignChapter"
ADD CONSTRAINT "TranslationCampaignChapter_externalTranslationJobId_fkey"
FOREIGN KEY ("externalTranslationJobId") REFERENCES "TranslationJob"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TranslationEarlyAccessGrant"
ADD CONSTRAINT "TranslationEarlyAccessGrant_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TranslationEarlyAccessGrant"
ADD CONSTRAINT "TranslationEarlyAccessGrant_translationJobId_fkey"
FOREIGN KEY ("translationJobId") REFERENCES "TranslationJob"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TranslationCampaignChapter"
ADD CONSTRAINT "TranslationCampaignChapter_allocatedCredits_nonnegative"
CHECK ("allocatedCredits" >= 0);

ALTER TABLE "TranslationContribution"
ADD CONSTRAINT "TranslationContribution_refundedCredits_valid"
CHECK ("refundedCredits" >= 0 AND "refundedCredits" <= "credits");
