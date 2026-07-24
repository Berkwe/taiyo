CREATE TYPE "ReportType" AS ENUM ('CHAPTER', 'PANEL');
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED', 'REJECTED');

ALTER TABLE "Series" ADD COLUMN "bannerStorageKey" TEXT;

CREATE TABLE "ContentReport" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "type" "ReportType" NOT NULL,
  "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
  "reasons" TEXT[],
  "description" TEXT,
  "attachmentStorageKey" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "userId" UUID NOT NULL,
  "releaseId" UUID NOT NULL,
  CONSTRAINT "ContentReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContentReport_status_createdAt_idx"
  ON "ContentReport"("status", "createdAt");
CREATE INDEX "ContentReport_userId_createdAt_idx"
  ON "ContentReport"("userId", "createdAt");
CREATE INDEX "ContentReport_releaseId_createdAt_idx"
  ON "ContentReport"("releaseId", "createdAt");

ALTER TABLE "ContentReport"
  ADD CONSTRAINT "ContentReport_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentReport"
  ADD CONSTRAINT "ContentReport_releaseId_fkey"
  FOREIGN KEY ("releaseId") REFERENCES "ChapterRelease"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
