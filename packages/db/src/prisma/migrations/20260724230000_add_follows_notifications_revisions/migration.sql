CREATE TYPE "SiteNotificationType" AS ENUM (
  'FOLLOWED_SERIES_RELEASE',
  'REPORT_STATUS',
  'ACCOUNT_UPDATE'
);
CREATE TYPE "RevisionEntityType" AS ENUM (
  'SERIES',
  'CHAPTER',
  'RELEASE',
  'REPORT',
  'USER'
);
CREATE TYPE "RevisionAction" AS ENUM (
  'CREATE',
  'UPDATE',
  'DELETE',
  'PUBLISH',
  'BULK_UPDATE'
);

-- Older development builds did not enforce this relation and could leave
-- progress rows behind after a user was removed.
DELETE FROM "ReadingProgressRecord" AS progress
WHERE NOT EXISTS (
  SELECT 1 FROM "User" AS app_user WHERE app_user."id" = progress."userId"
);

ALTER TABLE "ReadingProgressRecord"
  ADD CONSTRAINT "ReadingProgressRecord_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContentReport"
  ADD COLUMN "adminNote" TEXT,
  ADD COLUMN "resolvedAt" TIMESTAMP(3),
  ADD COLUMN "assignedToId" UUID;

CREATE TABLE "SeriesFollow" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "lastSeenReleaseAt" TIMESTAMP(3),
  "userId" UUID NOT NULL,
  "seriesId" UUID NOT NULL,
  CONSTRAINT "SeriesFollow_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SeriesFollow_userId_seriesId_key"
  ON "SeriesFollow"("userId", "seriesId");
CREATE INDEX "SeriesFollow_seriesId_createdAt_idx"
  ON "SeriesFollow"("seriesId", "createdAt");
CREATE INDEX "SeriesFollow_userId_updatedAt_idx"
  ON "SeriesFollow"("userId", "updatedAt");

CREATE TABLE "NotificationPreference" (
  "followedSeriesUpdates" BOOLEAN NOT NULL DEFAULT true,
  "reportStatusUpdates" BOOLEAN NOT NULL DEFAULT true,
  "accountUpdates" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "userId" UUID NOT NULL,
  CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "SiteNotification" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "type" "SiteNotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "href" TEXT,
  "dedupeKey" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" UUID NOT NULL,
  "seriesId" UUID,
  "releaseId" UUID,
  "reportId" UUID,
  CONSTRAINT "SiteNotification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SiteNotification_dedupeKey_key"
  ON "SiteNotification"("dedupeKey");
CREATE INDEX "SiteNotification_userId_readAt_createdAt_idx"
  ON "SiteNotification"("userId", "readAt", "createdAt");

CREATE TABLE "ContentRevision" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "entityType" "RevisionEntityType" NOT NULL,
  "entityId" UUID NOT NULL,
  "action" "RevisionAction" NOT NULL,
  "before" JSONB,
  "after" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actorId" UUID NOT NULL,
  CONSTRAINT "ContentRevision_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContentRevision_entityType_entityId_createdAt_idx"
  ON "ContentRevision"("entityType", "entityId", "createdAt");
CREATE INDEX "ContentRevision_actorId_createdAt_idx"
  ON "ContentRevision"("actorId", "createdAt");

ALTER TABLE "ContentReport"
  ADD CONSTRAINT "ContentReport_assignedToId_fkey"
  FOREIGN KEY ("assignedToId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SeriesFollow"
  ADD CONSTRAINT "SeriesFollow_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SeriesFollow"
  ADD CONSTRAINT "SeriesFollow_seriesId_fkey"
  FOREIGN KEY ("seriesId") REFERENCES "Series"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationPreference"
  ADD CONSTRAINT "NotificationPreference_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SiteNotification"
  ADD CONSTRAINT "SiteNotification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SiteNotification"
  ADD CONSTRAINT "SiteNotification_seriesId_fkey"
  FOREIGN KEY ("seriesId") REFERENCES "Series"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SiteNotification"
  ADD CONSTRAINT "SiteNotification_releaseId_fkey"
  FOREIGN KEY ("releaseId") REFERENCES "ChapterRelease"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SiteNotification"
  ADD CONSTRAINT "SiteNotification_reportId_fkey"
  FOREIGN KEY ("reportId") REFERENCES "ContentReport"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentRevision"
  ADD CONSTRAINT "ContentRevision_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
