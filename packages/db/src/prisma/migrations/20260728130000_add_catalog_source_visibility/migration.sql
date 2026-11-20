ALTER TABLE "CatalogSourceEdition"
ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "CatalogSourceChapter"
ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT true;

UPDATE "CatalogSourceEdition"
SET
  "isPublic" = false,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "sourceLanguage" = 'zh';
