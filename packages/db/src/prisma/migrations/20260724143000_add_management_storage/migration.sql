CREATE TYPE "Roles_new" AS ENUM ('USER', 'UPLOADER', 'EDITOR', 'ADMIN');

ALTER TABLE "User"
  ALTER COLUMN "role" DROP DEFAULT,
  ALTER COLUMN "role" TYPE "Roles_new"
  USING (
    CASE
      WHEN "role"::text = 'MODERATOR' THEN 'EDITOR'
      WHEN "role"::text = 'UPLOADER_INTERN' THEN 'UPLOADER'
      ELSE "role"::text
    END
  )::"Roles_new";

DROP TYPE "Roles";
ALTER TYPE "Roles_new" RENAME TO "Roles";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';

ALTER TABLE "Series" ADD COLUMN "coverStorageKey" TEXT;
ALTER TABLE "ChapterRelease" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "ReleasePage" RENAME COLUMN "assetUrl" TO "storageKey";

CREATE INDEX "ChapterRelease_deletedAt_status_idx"
  ON "ChapterRelease"("deletedAt", "status");
