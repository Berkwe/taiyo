import assert from "node:assert/strict"
import test from "node:test"
import { filterSeries, publicSeries } from "../src/features/platform/catalog.ts"
import {
  seriesFixtures,
  translationProfiles,
} from "../src/features/platform/fixtures.ts"
import {
  compareChapterNumbers,
  localized,
  parseReadingProgress,
  sortProfiles,
  toSearchDocument,
} from "../src/features/platform/logic.ts"
import { paths, slugify } from "../src/features/platform/paths.ts"
import {
  chapterSitemapEntries,
  seriesSitemapEntries,
  sitemapIndexXml,
} from "../src/features/platform/sitemap.ts"
import {
  activeReleaseForSource,
  anonymousSourceLabel,
  chapterThumbnail,
  distinctSources,
  selectDefaultRelease,
} from "../src/features/platform/source-editions.ts"
import { shouldReplaceProgress } from "../src/features/reading/merge-progress.ts"

test("normalizes Turkish slugs", () => {
  assert.equal(slugify("İç Anadolu & Bilim Kurgu"), "ic-anadolu-bilim-kurgu")
})

test("sorts chapter number strings numerically", () => {
  assert.deepEqual(["10", "2.5", "2"].sort(compareChapterNumbers), [
    "2",
    "2.5",
    "10",
  ])
})

test("falls back to Turkish localization", () => {
  assert.equal(localized({ tr: "Başlık" }, "en"), "Başlık")
})

test("sorts translation profiles by explicit priority", () => {
  assert.deepEqual(
    sortProfiles(translationProfiles).map((profile) => profile.slug),
    ["official", "ai-ultra", "ai-standart", "topluluk"],
  )
})

test("builds localized canonical paths without query state", () => {
  assert.equal(
    paths.chapter("tr", "gece-ekolari", "1"),
    "/tr/seri/gece-ekolari/bolum/1",
  )
  assert.equal(
    paths.reader("en", "gece-ekolari", "1", "release"),
    "/en/read/gece-ekolari/1/release",
  )
  assert.equal(paths.about("tr"), "/tr/hakkimizda")
  assert.equal(paths.about("en"), "/en/about")
  assert.equal(paths.market("tr"), "/tr/market")
  assert.equal(paths.profile("tr"), "/tr/profil")
})

test("validates reader progress and rejects corrupt state", () => {
  const value = JSON.stringify({
    releaseId: "release",
    chapterId: "chapter",
    pageNumber: 2,
    scrollRatio: 0.5,
    updatedAt: "2026-07-23T00:00:00.000Z",
  })
  assert.equal(parseReadingProgress(value)?.pageNumber, 2)
  assert.equal(parseReadingProgress('{"scrollRatio":2}'), null)
  assert.equal(parseReadingProgress("broken"), null)
})

test("represents localized series and release languages in search documents", () => {
  const document = toSearchDocument(seriesFixtures[0]!)
  assert.ok(document.titles.includes("Gece Ekoları"))
  assert.deepEqual(document.languages.sort(), ["en", "tr"])
})

test("filters series immediately by localized title, creator or genre", () => {
  assert.ok(
    filterSeries(publicSeries, { q: "Yıldız" }, "tr").some(
      (series) => series.slug === "yildiz-postanesi",
    ),
  )
  const creator = publicSeries[0]?.creators[0]?.name
  assert.ok(creator)
  assert.ok(filterSeries(publicSeries, { q: creator }, "tr").length > 0)
})

test("fixture domain has seven fictional series and multi-profile Turkish releases", () => {
  assert.equal(seriesFixtures.length, 7)
  const releases = seriesFixtures[0]!.chapters[0]!.releases.filter(
    (release) => release.targetLanguage === "tr",
  )
  assert.deepEqual(
    releases.map((release) => release.profileId),
    ["profile-ai-ultra", "profile-ai-standard", "profile-community"],
  )
})

test("anonymizes source editions by language and never exposes platforms", () => {
  const chapter = seriesFixtures[0]!.chapters[0]!
  const sources = distinctSources(chapter)
  assert.deepEqual(
    sources
      .filter((source) => source.sourceLanguage === "en")
      .map((source) => anonymousSourceLabel(source, sources, "tr")),
    ["İngilizce-1", "İngilizce-2"],
  )
  assert.equal(
    anonymousSourceLabel(
      sources.find((source) => source.sourceLanguage === "ko")!,
      sources,
      "tr",
    ),
    "Korece-1",
  )
  assert.doesNotMatch(JSON.stringify(chapter), /naver|webtoons?|kakao/iu)
})

test("prefers English, remembers an available source and falls back safely", () => {
  const chapter = seriesFixtures[0]!.chapters[0]!
  const defaultRelease = selectDefaultRelease(chapter, "tr")
  assert.equal(defaultRelease?.source.sourceLanguage, "en")
  const korean = distinctSources(chapter).find(
    (source) => source.sourceLanguage === "ko",
  )
  assert.ok(korean)
  assert.equal(
    selectDefaultRelease(chapter, "tr", korean.id)?.source.id,
    korean.id,
  )
  assert.equal(
    selectDefaultRelease(chapter, "tr", "missing-source")?.source
      .sourceLanguage,
    "en",
  )

  const singleKorean = structuredClone(chapter)
  singleKorean.releases = singleKorean.releases.filter(
    (release) => release.source.sourceLanguage === "ko",
  )
  assert.equal(
    selectDefaultRelease(singleKorean, "tr")?.source.sourceLanguage,
    "ko",
  )

  const singleEnglish = structuredClone(chapter)
  const englishSource = distinctSources(singleEnglish).find(
    (source) => source.sourceLanguage === "en",
  )!
  singleEnglish.releases = singleEnglish.releases.filter(
    (release) => release.source.id === englishSource.id,
  )
  assert.equal(
    selectDefaultRelease(singleEnglish, "tr")?.source.sourceLanguage,
    "en",
  )
})

test("uses only active premium translation and follows thumbnail fallbacks", () => {
  const chapter = structuredClone(seriesFixtures[0]!.chapters[0]!)
  const premium = chapter.releases.find(
    (release) => release.qualityTier === "premium",
  )!
  const balanced = {
    ...structuredClone(premium),
    id: "archived-balanced",
    qualityTier: "balanced" as const,
    isActive: false,
  }
  chapter.releases.push(balanced)
  assert.equal(
    activeReleaseForSource(chapter, premium.source.id, premium.targetLanguage)
      ?.qualityTier,
    "premium",
  )
  assert.equal(
    chapterThumbnail(chapter, "/fallback.svg"),
    premium.pages[0]!.src,
  )
  chapter.thumbnail = "/chosen-thumbnail.webp"
  assert.equal(
    chapterThumbnail(chapter, "/fallback.svg"),
    "/chosen-thumbnail.webp",
  )
  chapter.thumbnail = undefined
  chapter.releases = []
  assert.equal(chapterThumbnail(chapter, "/fallback.svg"), "/fallback.svg")
  assert.equal(chapterThumbnail(chapter), null)
})

test("star post office demo uses storage-backed pages and three chapters", () => {
  const series = seriesFixtures.find(
    (candidate) => candidate.slug === "yildiz-postanesi",
  )
  assert.ok(series)
  assert.equal(series.chapters.length, 3)
  assert.match(series.cover, /^\/api\/storage\//)
  for (const chapter of series.chapters) {
    const release = chapter.releases.find(
      (candidate) => candidate.targetLanguage === "tr",
    )
    assert.equal(release?.pages.length, 3)
    assert.ok(release?.pages.every((page) => page.storageKey))
  }
})

test("guest progress merge keeps completed or furthest progress idempotently", () => {
  const current = {
    pageNumber: 8,
    scrollRatio: 0.8,
    updatedAt: new Date("2026-07-24T10:00:00Z"),
    completedAt: null,
  }
  assert.equal(
    shouldReplaceProgress(current, {
      ...current,
      pageNumber: 4,
      scrollRatio: 0.4,
      updatedAt: new Date("2026-07-24T12:00:00Z"),
    }),
    false,
  )
  assert.equal(
    shouldReplaceProgress(current, {
      ...current,
      completedAt: new Date("2026-07-24T09:00:00Z"),
    }),
    true,
  )
  assert.equal(shouldReplaceProgress(current, current), false)
})

test("sitemap index separates public series and chapter routes", async () => {
  const index = sitemapIndexXml([
    "/sitemaps/series.xml",
    "/sitemaps/chapters.xml",
  ])
  const seriesEntries = await seriesSitemapEntries()
  const chapterEntries = await chapterSitemapEntries()
  assert.match(index, /<sitemapindex/)
  assert.ok(seriesEntries.length > 0)
  assert.ok(chapterEntries.length > seriesEntries.length)
  assert.ok(
    chapterEntries.every(
      (entry) => !entry.url.includes("/oku/") && !entry.url.includes("/read/"),
    ),
  )
})
