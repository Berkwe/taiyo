DROP INDEX IF EXISTS "ChapterRelease_chapterId_targetLanguage_translationProfileId_revision_key";
DROP INDEX IF EXISTS "ChapterRelease_chapterId_targetLanguage_translationProfileId_re";

CREATE UNIQUE INDEX "ChapterRelease_chapter_source_language_profile_revision_key"
  ON "ChapterRelease"(
    "chapterId",
    "sourceId",
    "targetLanguage",
    "translationProfileId",
    "revision"
  );
