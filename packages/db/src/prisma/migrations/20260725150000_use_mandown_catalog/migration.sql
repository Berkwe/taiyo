ALTER TABLE "CatalogSourceEdition" ADD COLUMN "sourceUrl" TEXT;
ALTER TABLE "TranslationJob" ALTER COLUMN "provider" SET DEFAULT 'mandown';

-- The public translation catalog is now populated from Mandown search results.
-- Remove the former fictional rows and their cascading chapters/preferences.
DELETE FROM "CatalogSeries" WHERE "providerKey" = 'mock';
