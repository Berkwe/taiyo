ALTER TABLE "CatalogSourceEdition"
ADD COLUMN "fallbackSourceUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
