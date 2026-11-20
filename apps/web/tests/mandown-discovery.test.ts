import assert from "node:assert/strict"
import { createHmac } from "node:crypto"
import { mock, test } from "node:test"
import { db } from "@taiyomoe/db"
import type { MandownSourceDiscoveryOutput } from "../src/features/translation/mandown-bridge"
import {
  MandownSourceCatalogProvider,
  mergeDiscoveredSources,
  resolveSelectionSources,
} from "../src/features/translation/provider"

process.env.BETTER_AUTH_SECRET = "discovery-test-only-secret"

const selection = {
  version: 1 as const,
  manga: {
    id: 42,
    id_mal: null,
    title: { english: "Fictional Star", romaji: null, native: null },
    synonyms: [],
    format: "MANGA",
    status: "RELEASING",
    country_of_origin: "KR",
    popularity: null,
    average_score: null,
    cover_image: null,
    site_url: null,
    description: null,
    chapters: null,
    volumes: null,
    genres: [],
    external_links: [],
  },
  sources: [
    {
      provider: "webtoons" as const,
      url: "https://www.webtoons.com/en/action/fictional-star/list?title_no=42",
      language: "en" as const,
      site: "WEBTOON",
      type: "STREAMING",
      is_disabled: false,
      fallbackUrls: [
        "https://www.webtoons.com/en/action/fictional-star/list?title_no=43",
      ],
    },
  ],
}

function token() {
  const encoded = Buffer.from(JSON.stringify(selection)).toString("base64url")
  return `${encoded}.${createHmac(
    "sha256",
    process.env.BETTER_AUTH_SECRET as string,
  )
    .update(encoded)
    .digest("base64url")}`
}

function discovery(): MandownSourceDiscoveryOutput {
  return {
    threshold: 54,
    errors: [],
    timings: {},
    providers: [],
    links: [
      {
        provider: "mangadex",
        url: "https://mangadex.org/title/00000000-0000-0000-0000-000000000042",
        language: null,
        method: "SAME_JEV",
        metadata_status: "ok",
      },
    ],
  }
}

test("selection keeps direct sources and merges accepted Mandown links", async () => {
  const ids: number[] = []
  const result = await resolveSelectionSources(token(), async (id) => {
    ids.push(id)
    return discovery()
  })
  assert.deepEqual(ids, [42])
  assert.equal(result.discoveryComplete, true)
  assert.deepEqual(
    result.sources.map((source) => source.provider),
    ["webtoons", "mangadex"],
  )
  assert.deepEqual(
    result.sources[0]?.fallbackUrls,
    selection.sources[0]?.fallbackUrls,
  )
  assert.equal(result.sources[1]?.language, "en")
})

test("invalid signature initiates no discovery", async () => {
  let calls = 0
  await assert.rejects(
    resolveSelectionSources("invalid.signature", async () => {
      calls++
      return discovery()
    }),
  )
  assert.equal(calls, 0)
})

test("partial failures keep trusted links and mark discovery incomplete", async () => {
  const response = discovery()
  response.errors = [{ decision: "JEV_ERROR", provider: "mangadex" }]
  const result = await resolveSelectionSources(token(), async () => response)
  assert.equal(result.discoveryComplete, false)
  assert.equal(result.sources.length, 2)
})

test("whole discovery failure falls back to the signed source set", async () => {
  const result = await resolveSelectionSources(token(), async () => {
    throw new Error("fixture upstream failure")
  })
  assert.equal(result.discoveryComplete, false)
  assert.deepEqual(result.sources, selection.sources)
})

test("duplicate sources are consolidated without losing fallback URLs", () => {
  const response = discovery()
  response.links.push({
    ...response.links[0]!,
    url: "https://mangadex.org/title/00000000-0000-0000-0000-000000000043",
  })
  const sources = mergeDiscoveredSources(selection, response)
  assert.equal(sources.length, 2)
  assert.equal(sources[1]?.fallbackUrls.length, 1)
})

test("unapproved URLs, rejected methods and metadata errors are excluded", () => {
  const response = discovery()
  response.links = [
    { ...response.links[0]!, url: "https://example.test/not-a-source" },
    { ...response.links[0]!, method: "DIFFERENT_JEV" as "SAME_JEV" },
    { ...response.links[0]!, metadata_status: "error" },
    { ...response.links[0]!, provider: "webtoons" },
  ]
  assert.deepEqual(
    mergeDiscoveredSources(selection, response),
    selection.sources,
  )
})

test("Naver Series URLs keep their separate provider mapping", () => {
  const response = discovery()
  response.links = [
    {
      provider: "naver",
      url: "https://series.naver.com/comic/detail.series?productNo=42",
      language: "Korean",
      method: "SAME_DIRECT_LINK",
      metadata_status: "not_fetched",
    },
  ]
  assert.equal(
    mergeDiscoveredSources(selection, response)[1]?.provider,
    "naver_series",
  )
})

for (const complete of [false, true]) {
  test(`catalog persistence deactivates missing editions only after complete discovery (${complete})`, async () => {
    let deactivations = 0
    let upserts = 0
    const tx = {
      catalogSeries: { upsert: async () => ({ id: "fixture-id" }) },
      catalogSourceEdition: {
        updateMany: async () => {
          deactivations++
          return { count: 0 }
        },
        upsert: async () => {
          upserts++
          return {}
        },
      },
    }
    const originalTransaction = db.$transaction
    Object.assign(db, {
      $transaction: async (fn: (arg: typeof tx) => Promise<unknown>) => fn(tx),
    })
    const provider = new MandownSourceCatalogProvider(async () => ({
      ...discovery(),
      errors: complete ? [] : [{ decision: "JEV_ERROR" }],
    }))
    const details = mock.method(provider, "getSeriesDetails", async () => ({
      id: "fixture-id",
    }))
    try {
      await provider.selectSeries(token())
      assert.equal(deactivations, complete ? 1 : 0)
      assert.equal(upserts, 2)
    } finally {
      Object.assign(db, { $transaction: originalTransaction })
      details.mock.restore()
    }
  })
}
