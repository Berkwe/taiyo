import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import test from "node:test"
import { db } from "@taiyomoe/db"
import { batchStatusFromItems } from "../src/features/translation/batch-instant"
import {
  adjustPackageForExternalCompletion,
  compactChapterNumbers,
  proportionalContributorRefunds,
  restorePackageAfterInstantFailure,
} from "../src/features/translation/campaign-accounting"
import {
  jsonSafeTranslationJobPayload,
  MandownTranslationJobDispatcher,
} from "../src/features/translation/job-dispatcher"
import {
  isUnavailableNaverMirrorError,
  MandownBridgeError,
  runMandown,
} from "../src/features/translation/mandown-bridge"
import {
  filterMissingCatalogChapters,
  safeMandownDownloadPath,
  translationFollowerIds,
} from "../src/features/translation/mandown-import"
import {
  quoteTranslation,
  translationConfig,
} from "../src/features/translation/pricing"
import {
  compareCatalogChapterNumbers,
  consolidateDuplicateSources,
  defaultCatalogSourceVisibility,
  filterAniListItemsByAdultFlag,
  filterCatalogEntriesBySourceAvailability,
  firstAvailableSourceDetails,
  loadPublicCatalogSelection,
  MandownSourceCatalogProvider,
  normalizeCatalogQuery,
  normalizeSourceLanguage,
  parseNaverSeriesChapterCount,
  preferPrimarySourceLanguages,
  syncCatalogSourceChapters,
} from "../src/features/translation/provider"
import {
  orderSourceEditionsByAccess,
  type SourceCatalogProvider,
  sourceEditionHydrationTiers,
} from "../src/features/translation/types"
import { safeReturnPath } from "../src/utils/safe-return-path"

test("catalog normalization supports Turkish characters", () => {
  assert.equal(normalizeCatalogQuery("  YÖRÜNGE IŞIĞI  "), "yorunge-isigi")
})

test("AniList source languages are normalized from metadata and URLs", () => {
  assert.equal(
    normalizeSourceLanguage(
      "English",
      "https://www.webtoons.com/en/action/example/list?title_no=1",
    ),
    "en",
  )
  assert.equal(
    normalizeSourceLanguage(
      null,
      "https://comic.naver.com/webtoon/list?titleId=1",
    ),
    "ko",
  )
  assert.equal(
    normalizeSourceLanguage(
      null,
      "https://www.webtoons.com/fr/fantasy/example/list?title_no=1",
    ),
    "fr",
  )
})

test("AniList adult results require an explicit flag and enabled setting", () => {
  const items = [
    { manga: { id: 1 }, title: "safe" },
    { manga: { id: 2 }, title: "adult" },
    { manga: { id: 3 }, title: "unknown" },
  ]
  const flags = new Map([
    [1, false],
    [2, true],
  ])
  assert.deepEqual(
    filterAniListItemsByAdultFlag(items, flags, false).map(
      (item) => item.title,
    ),
    ["safe"],
  )
  assert.deepEqual(
    filterAniListItemsByAdultFlag(items, flags, true).map((item) => item.title),
    ["safe", "adult"],
  )
})

test("catalog search can require at least one resolved source", () => {
  const entries = [
    { title: "available", sources: [{ provider: "fixture" }] },
    { title: "unavailable", sources: [] },
  ]
  assert.deepEqual(
    filterCatalogEntriesBySourceAvailability(entries, false).map(
      (entry) => entry.title,
    ),
    ["available", "unavailable"],
  )
  assert.deepEqual(
    filterCatalogEntriesBySourceAvailability(entries, true).map(
      (entry) => entry.title,
    ),
    ["available"],
  )
})

test("English and Korean sources take priority over other supported languages", () => {
  const source = (
    language: "en" | "ko" | "fr",
    provider: "webtoons" | "naver",
  ) => ({
    provider,
    url:
      provider === "naver"
        ? "https://comic.naver.com/webtoon/list?titleId=1"
        : `https://www.webtoons.com/${language}/fantasy/example/list?title_no=1`,
    language,
    site: provider,
    type: "STREAMING",
    is_disabled: false,
    fallbackUrls: [],
  })
  assert.deepEqual(
    preferPrimarySourceLanguages([
      source("fr", "webtoons"),
      source("en", "webtoons"),
      source("ko", "naver"),
    ]).map((item) => item.language),
    ["en", "ko"],
  )
  assert.deepEqual(
    preferPrimarySourceLanguages([source("fr", "webtoons")]).map(
      (item) => item.language,
    ),
    ["fr"],
  )
})

test("free and paid Naver sources stay separate while true duplicates merge", () => {
  const sources = consolidateDuplicateSources([
    {
      provider: "naver_series",
      url: "https://series.naver.com/comic/detail.series?productNo=6575576",
      fallbackUrls: [],
      language: "ko",
      site: "Naver Series",
      type: "STREAMING",
      is_disabled: false,
    },
    {
      provider: "naver",
      url: "https://comic.naver.com/webtoon/list?titleId=780170",
      fallbackUrls: [],
      language: "ko",
      site: "Naver Webtoon",
      type: "STREAMING",
      is_disabled: false,
    },
    {
      provider: "webtoons",
      url: "https://www.webtoons.com/en/fantasy/example/list?title_no=1",
      fallbackUrls: [],
      language: "en",
      site: "WEBTOON",
      type: "STREAMING",
      is_disabled: false,
    },
    {
      provider: "webtoons",
      url: "https://m.webtoons.com/en/fantasy/example/list?title_no=1",
      fallbackUrls: [],
      language: "en",
      site: "WEBTOON",
      type: "STREAMING",
      is_disabled: false,
    },
  ])
  assert.equal(sources.length, 3)
  const freeNaver = sources.find((source) => source.provider === "naver")
  const paidNaver = sources.find((source) => source.provider === "naver_series")
  assert.deepEqual(freeNaver?.fallbackUrls, [])
  assert.deepEqual(paidNaver?.fallbackUrls, [])
  const english = sources.find((source) => source.language === "en")
  assert.deepEqual(english?.fallbackUrls, [
    "https://m.webtoons.com/en/fantasy/example/list?title_no=1",
  ])
})

test("available sources are ordered and hydrated before paid sources", () => {
  const paid = {
    id: "paid",
    accessStatus: "paid-account-required" as const,
    priority: 100,
  }
  const lowerPriorityAvailable = {
    id: "available-low",
    accessStatus: "available" as const,
    priority: 10,
  }
  const higherPriorityAvailable = {
    id: "available-high",
    accessStatus: "available" as const,
    priority: 20,
  }
  const ordered = orderSourceEditionsByAccess([
    paid,
    lowerPriorityAvailable,
    higherPriorityAvailable,
  ])
  assert.deepEqual(
    ordered.map((source) => source.id),
    ["available-high", "available-low", "paid"],
  )
  const [availableTier, paidTier] = sourceEditionHydrationTiers(ordered)
  assert.deepEqual(
    availableTier.map((source) => source.id),
    ["available-high", "available-low"],
  )
  assert.deepEqual(
    paidTier.map((source) => source.id),
    ["paid"],
  )
})

test("new Chinese catalog sources stay hidden until management publishes them", () => {
  assert.equal(defaultCatalogSourceVisibility("zh"), false)
  assert.equal(defaultCatalogSourceVisibility("en"), true)
  assert.equal(defaultCatalogSourceVisibility("ko"), true)
})

test("request validation hydrates the selected source before checking chapters", async () => {
  const hydratedEdition = {
    id: "edition",
    publicSourceLabel: "İngilizce-1",
    sourceLanguage: "en" as const,
    sourceLanguageLabel: "İngilizce",
    provider: "webtoons" as const,
    providerLabel: "İngilizce-1",
    accessStatus: "available" as const,
    description: "Fixture source",
    chapterCount: 1,
    lastChapterNumber: "1",
    priority: 100,
    chaptersLoaded: true,
    chapters: [
      {
        id: "chapter",
        externalChapterId: "external-chapter",
        number: "1",
        sortKey: 1,
      },
    ],
  }
  let hydrationRequested = false
  const provider: SourceCatalogProvider = {
    searchSeries: async () => [],
    selectSeries: async () => {
      throw new Error("not used")
    },
    getSeriesDetails: async () => ({
      id: "series",
      canonicalKey: "fixture",
      title: "Fixture",
      originalTitle: "Fixture",
      alternativeTitles: [],
      description: "Fixture",
      cover: "/placeholders/series-cover.svg",
      publicationStatus: "ongoing",
      editions: [
        {
          ...hydratedEdition,
          chapterCount: 0,
          lastChapterNumber: "—",
          chaptersLoaded: false,
          chapters: [],
        },
      ],
    }),
    getSourceEditionDetails: async () => {
      hydrationRequested = true
      return hydratedEdition
    },
    listSourceEditions: async () => [],
    listSourceChapters: async () => [],
    refreshSourceEdition: async () => undefined,
  }
  const selection = await loadPublicCatalogSelection(
    "series",
    "edition",
    provider,
  )
  assert.equal(hydrationRequested, true)
  assert.equal(selection?.edition.chapters[0]?.id, "chapter")
})

test("Naver Series total chapter count is read from its public catalog page", () => {
  assert.equal(
    parseNaverSeriesChapterCount(
      '<span class="end_total_episode">총 <strong>72</strong>화</span>',
    ),
    72,
  )
  assert.equal(parseNaverSeriesChapterCount("<html>missing</html>"), null)
})

test("source details fall back after the preferred source fails", async () => {
  const attempts: string[] = []
  const fallback =
    "https://series.naver.com/comic/detail.series?productNo=6575576"
  const result = await firstAvailableSourceDetails(
    ["https://comic.naver.com/webtoon/list?titleId=780170", fallback],
    async (url) => {
      attempts.push(url)
      if (url.includes("comic.naver.com"))
        throw new Error("preferred domain unavailable")
      return {
        metadata: {
          title: "Fixture",
          authors: [],
          url,
          genres: [],
          description: "",
          cover_art: "",
          title_slug: "fixture",
        },
        chapters: [],
      }
    },
  )
  assert.equal(result.url, fallback)
  assert.equal(attempts.length, 2)
})

test("descending source chapters are ordered by their real chapter number", () => {
  const chapters = ["225", "224", "10", "2", "1"]
    .map((number) => ({ number }))
    .sort(compareCatalogChapterNumbers)
  assert.deepEqual(
    chapters.map((chapter) => chapter.number),
    ["1", "2", "10", "224", "225"],
  )
})

test("Mandown service reuses one process and preserves application errors", async () => {
  const [first, second] = await Promise.all([
    runMandown<{ pid: number }>(["health"], 10_000),
    runMandown<{ pid: number }>(["health"], 10_000),
  ])
  const third = await runMandown<{ pid: number }>(["health"], 10_000)
  assert.equal(first.pid, second.pid)
  assert.equal(second.pid, third.pid)
  await assert.rejects(
    runMandown(["source-details", "https://example.com/not-supported"], 10_000),
    MandownBridgeError,
  )
})

test("missing Naver Webtoon mirrors are treated as permanently unavailable", () => {
  assert.equal(
    isUnavailableNaverMirrorError(
      new MandownBridgeError(
        "Naver Series response error: no downloadable Naver Webtoon mirror matched 'fixture'.",
        "SourceResponseError",
      ),
    ),
    true,
  )
  assert.equal(
    isUnavailableNaverMirrorError(
      new MandownBridgeError(
        "WEBTOON response error: temporary upstream failure.",
        "SourceResponseError",
      ),
    ),
    false,
  )
})

test(
  "Mandown search resolves sources before the selected manga is persisted",
  { timeout: 180_000 },
  async () => {
    const provider = new MandownSourceCatalogProvider()
    const results = await provider.searchSeries("Tower of God")
    assert.ok(results.length > 0)
    const tower = results.find((item) => item.title.english === "Tower of God")
    assert.ok(tower)
    assert.ok(tower.title.romaji)
    assert.ok(tower.title.native)
    assert.ok(tower.cover)
    assert.ok(tower.publicationStatus)
    assert.ok(tower.format)

    const selected = await provider.selectSeries(tower.selectionToken)
    assert.ok(selected.editions.length > 0)
    assert.ok(
      selected.editions.every(
        (edition) =>
          /^(İngilizce|Korece)-\d+$/.test(edition.publicSourceLabel) &&
          edition.providerLabel === edition.publicSourceLabel &&
          edition.sourceLanguage &&
          edition.sourceLanguageLabel &&
          !/WEBTOON|Naver|MangaDex/i.test(edition.description),
      ),
    )
    assert.ok(
      selected.editions.some((edition) => edition.provider === "naver_series"),
    )
    assert.ok(
      selected.editions.some(
        (edition) =>
          edition.provider === "webtoons" &&
          edition.sourceLanguage === "en" &&
          edition.accessStatus === "available",
      ),
    )

    const details = await provider.getSeriesDetails(selected.id)
    assert.ok(details)
    assert.ok(details.editions.every((edition) => !edition.chapters.length))
    const hydrated = await provider.getSourceEditionDetails(
      details.editions[0]!.id,
    )
    assert.ok(hydrated?.chapters.length)
    assert.match(details.cover, /^\/api\/translation\/catalog\//)

    const unsupportedResults = await provider.searchSeries(
      "Babel-shiki Kami Girl",
    )
    const unsupportedResult = unsupportedResults.find(
      (item) => item.anilistId === 115753,
    )
    assert.ok(unsupportedResult)
    const unsupported = await provider.selectSeries(
      unsupportedResult.selectionToken,
    )
    assert.equal(unsupported.editions.length, 0)
  },
)

test("catalog refresh keeps a chapter stable when its source URL changes", async () => {
  const fixtureKey = `chapter-sync-${randomUUID()}`
  const series = await db.catalogSeries.create({
    data: {
      providerKey: fixtureKey,
      externalSeriesId: fixtureKey,
      canonicalKey: fixtureKey,
      title: "Fictional Chapter Sync Fixture",
      originalTitle: "Fictional Chapter Sync Fixture",
      description: "Local regression fixture.",
      coverPath: "/placeholders/series-cover.svg",
      publicationStatus: "ONGOING",
    },
  })

  try {
    const edition = await db.catalogSourceEdition.create({
      data: {
        catalogSeriesId: series.id,
        externalEditionId: fixtureKey,
        sourceUrl: `https://www.webtoons.com/en/fantasy/${fixtureKey}/list?title_no=1`,
        backendPlatform: "WEBTOONS",
        sourceLanguage: "en",
        publicSourceLabel: "İngilizce-1",
        publicDescription: "Local regression fixture.",
        priority: 100,
      },
    })
    const original = await db.catalogSourceChapter.create({
      data: {
        sourceEditionId: edition.id,
        externalChapterId: "old-source-identity",
        chapterNumber: "7",
        sortKey: 1,
        title: "Old title",
        isPublic: false,
      },
    })
    const removed = await db.catalogSourceChapter.create({
      data: {
        sourceEditionId: edition.id,
        externalChapterId: "removed-source-identity",
        chapterNumber: "8",
        sortKey: 2,
        title: "Removed title",
      },
    })

    const synchronized = await db.$transaction((tx) =>
      syncCatalogSourceChapters(tx, edition.id, [
        {
          title: "Updated title",
          url: "https://www.webtoons.com/en/fixture/episode-7?episode_no=700",
          slug: "episode-7",
          chapterNumber: "7",
        },
        {
          title: "Duplicate source entry",
          url: "https://www.webtoons.com/en/fixture/episode-7-alt?episode_no=701",
          slug: "episode-7-alt",
          chapterNumber: "7",
        },
      ]),
    )
    assert.equal(synchronized.length, 1)
    assert.equal(synchronized[0]?.id, original.id)

    const chapters = await db.catalogSourceChapter.findMany({
      where: { sourceEditionId: edition.id },
      orderBy: { chapterNumber: "asc" },
    })
    assert.equal(chapters.length, 2)
    assert.equal(chapters[0]?.id, original.id)
    assert.equal(chapters[0]?.externalChapterId, "old-source-identity")
    assert.equal(chapters[0]?.chapterNumber, "7")
    assert.equal(chapters[0]?.title, "Updated title")
    assert.equal(chapters[0]?.isAvailable, true)
    assert.equal(chapters[0]?.isPublic, false)
    assert.equal(chapters[1]?.id, removed.id)
    assert.equal(chapters[1]?.isAvailable, false)

    const emptied = await db.$transaction((tx) =>
      syncCatalogSourceChapters(tx, edition.id, []),
    )
    assert.deepEqual(emptied, [])
    assert.equal(
      await db.catalogSourceChapter.count({
        where: { sourceEditionId: edition.id, isAvailable: true },
      }),
      0,
    )
  } finally {
    await db.catalogSeries.delete({ where: { id: series.id } })
  }
})

test("pricing calculates balanced, premium and multiple chapters", () => {
  const chapters = [
    { id: "one", number: "1" },
    { id: "two", number: "2" },
  ]
  assert.equal(
    quoteTranslation({ chapters, qualityTier: "balanced" }).totalCredits,
    translationConfig.balancedCredits * 2,
  )
  assert.equal(
    quoteTranslation({ chapters, qualityTier: "premium" }).totalCredits,
    translationConfig.premiumCredits * 2,
  )
})

test("single chapter price stays independent from package funding progress", () => {
  const packageRemainingCredits = 900 - 200
  const quote = quoteTranslation({
    chapters: [{ id: "chapter-3", number: "3" }],
    qualityTier: "balanced",
  })

  assert.equal(packageRemainingCredits, 700)
  assert.equal(quote.totalCredits, 100)
  assert.equal(quote.remainingCredits, 100)
})

test("long chapter selections keep only both edges visible", () => {
  assert.equal(
    compactChapterNumbers(["3", "4", "5", "6", "64", "65", "66"]),
    "3, 4, …, 65, 66",
  )
  assert.equal(compactChapterNumbers(["3", "4", "5"]), "3, 4, 5")
})

test("campaign excess is refunded proportionally with deterministic rounding", () => {
  assert.deepEqual(
    proportionalContributorRefunds(
      [
        { userId: "b", credits: 30 },
        { userId: "a", credits: 70 },
      ],
      33,
    ),
    [
      { userId: "a", credits: 23 },
      { userId: "b", credits: 10 },
    ],
  )
  assert.deepEqual(
    proportionalContributorRefunds(
      [
        { userId: "a", credits: 1 },
        { userId: "b", credits: 1 },
        { userId: "c", credits: 1 },
      ],
      2,
    ),
    [
      { userId: "a", credits: 1 },
      { userId: "b", credits: 1 },
    ],
  )
})

test("external completion adjusts and safely restores package accounting", () => {
  assert.deepEqual(
    adjustPackageForExternalCompletion({
      targetCredits: 300,
      fundedCredits: 250,
      allocatedCredits: 100,
    }),
    {
      targetCredits: 200,
      fundedCredits: 200,
      refundCredits: 50,
      funded: true,
    },
  )
  assert.deepEqual(
    restorePackageAfterInstantFailure({
      adjustedTargetCredits: 200,
      fundedCredits: 200,
      allocatedCredits: 100,
    }),
    {
      targetCredits: 300,
      fundedCredits: 200,
      funded: false,
    },
  )
})

test("batch status preserves independent chapter outcomes", () => {
  assert.equal(
    batchStatusFromItems(["COMPLETED", "FAILED", "EXCLUDED"]),
    "PARTIAL_FAILED",
  )
  assert.equal(
    batchStatusFromItems(["COMPLETED", "COMPLETED", "EXCLUDED"]),
    "COMPLETED",
  )
  assert.equal(
    batchStatusFromItems(["COMPLETED", "PROCESSING", "EXCLUDED"]),
    "PROCESSING",
  )
})

test("pricing handles active translations and premium upgrade", () => {
  const chapters = [
    { id: "one", number: "1" },
    { id: "two", number: "2" },
  ]
  const balanced = quoteTranslation({
    chapters,
    qualityTier: "balanced",
    active: { one: "balanced", two: "premium" },
  })
  assert.equal(balanced.totalCredits, 0)
  assert.deepEqual(
    balanced.lines.map((line) => line.status),
    ["active", "redundant"],
  )
  const premium = quoteTranslation({
    chapters: [chapters[0]!],
    qualityTier: "premium",
    active: { one: "balanced" },
  })
  assert.equal(premium.lines[0]?.status, "upgrade")
  assert.equal(premium.totalCredits, translationConfig.premiumCredits)
})

test("pricing enforces request chapter limit", () => {
  assert.throws(
    () =>
      quoteTranslation({
        chapters: Array.from(
          { length: translationConfig.maxChapters + 1 },
          (_, index) => ({ id: String(index), number: String(index + 1) }),
        ),
        qualityTier: "balanced",
      }),
    /en fazla/,
  )
})

test("return paths stay on the Novora origin", () => {
  assert.equal(
    safeReturnPath("%2Ftranslate%3Fq%3DSinyal"),
    "/translate?q=Sinyal",
  )
  assert.equal(safeReturnPath("https://example.com"), "/tr")
  assert.equal(safeReturnPath("//example.com"), "/tr")
})

test("Mandown archives stay inside the configured download root", () => {
  assert.equal(
    safeMandownDownloadPath("/tmp/novora-mandown", "/tmp/novora-mandown/a.cbz"),
    "/tmp/novora-mandown/a.cbz",
  )
  assert.throws(
    () =>
      safeMandownDownloadPath(
        "/tmp/novora-mandown",
        "/tmp/novora-mandown-escape/a.cbz",
      ),
    /indirme dizininin dışında/,
  )
})

test("Mandown skips chapters that already exist in the canonical series", () => {
  const chapters = [
    { id: "one", chapterNumber: "1" },
    { id: "two", chapterNumber: "2" },
    { id: "three", chapterNumber: "3" },
  ]

  assert.deepEqual(
    filterMissingCatalogChapters(chapters, ["1", "3"]).map(
      (chapter) => chapter.id,
    ),
    ["two"],
  )
})

test("AI translation completion follows the series for owner and contributors", () => {
  assert.deepEqual(
    translationFollowerIds("owner", [
      "contributor-one",
      "owner",
      "contributor-two",
      "contributor-one",
    ]),
    ["owner", "contributor-one", "contributor-two"],
  )
})

test("Mandown job payload omits an absent canonical series id", async () => {
  const payload = jsonSafeTranslationJobPayload({
    canonicalSeriesId: undefined,
    catalogSeriesId: "catalog",
    sourceEditionId: "edition",
    externalChapterIds: ["chapter"],
    backendPlatform: "WEBTOONS",
    sourceLanguage: "en",
    outputLanguage: "tr",
    qualityTier: "balanced",
    pipelineVersion: "mandown-test",
    callbackUrl: "/callback",
    idempotencyKey: "job:test",
  })
  assert.equal("canonicalSeriesId" in payload, false)
  assert.doesNotMatch(JSON.stringify(payload), /canonicalSeriesId/)

  const queued = await new MandownTranslationJobDispatcher().enqueueTranslation(
    payload,
  )
  assert.equal("canonicalSeriesId" in queued.payload, false)
})
