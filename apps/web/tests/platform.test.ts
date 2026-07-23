import assert from "node:assert/strict"
import test from "node:test"
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

test("fixture domain has six fictional series and multi-profile Turkish releases", () => {
  assert.equal(seriesFixtures.length, 6)
  const releases = seriesFixtures[0]!.chapters[0]!.releases.filter(
    (release) => release.targetLanguage === "tr",
  )
  assert.deepEqual(
    releases.map((release) => release.profileId),
    ["profile-ai-ultra", "profile-ai-standard", "profile-community"],
  )
})
