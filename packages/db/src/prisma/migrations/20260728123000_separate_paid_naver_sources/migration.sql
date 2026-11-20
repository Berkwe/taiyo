UPDATE "CatalogSourceEdition"
SET
  "fallbackSourceUrls" = ARRAY(
    SELECT candidate
    FROM unnest("fallbackSourceUrls") AS candidate
    WHERE candidate NOT LIKE '%://series.naver.com/%'
      AND candidate NOT LIKE '%://m.series.naver.com/%'
  ),
  "updatedAt" = CURRENT_TIMESTAMP
WHERE
  "sourceUrl" LIKE '%://comic.naver.com/%'
  OR "sourceUrl" LIKE '%://m.comic.naver.com/%';

UPDATE "CatalogSourceEdition"
SET
  "lastUpdatedAt" = NULL,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE
  "sourceUrl" LIKE '%://series.naver.com/%'
  OR "sourceUrl" LIKE '%://m.series.naver.com/%';
