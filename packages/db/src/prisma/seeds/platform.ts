import { readFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { checksum, getStorage } from "@taiyomoe/storage"
import { db } from "../.."

const demoSeries = [
  [
    "gece-ekolari",
    "Gece Ekoları",
    "Echoes After Midnight",
    "WEBTOON",
    "ONGOING",
    "ko",
  ],
  [
    "kirik-yorunge",
    "Kırık Yörünge",
    "Fractured Orbit",
    "MANGA",
    "COMPLETED",
    "ja",
  ],
  ["cam-bahce", "Cam Bahçe", "The Glass Garden", "MANHWA", "ONGOING", "ko"],
  [
    "sessiz-nehir",
    "Sessiz Nehir",
    "The Silent River",
    "MANHUA",
    "HIATUS",
    "zh",
  ],
  ["son-sinyal", "Son Sinyal", "The Last Signal", "COMIC", "ONGOING", "en"],
  [
    "bulut-cayevi",
    "Bulut Çayevi",
    "The Cloud Teahouse",
    "LIGHT_NOVEL",
    "COMPLETED",
    "tr",
  ],
] as const

const profiles = [
  {
    slug: "ai-ultra",
    labelKey: "translationProfiles.aiUltra.label",
    descriptionKey: "translationProfiles.aiUltra.description",
    sortOrder: 10,
    isAiGenerated: true,
    isHumanReviewed: true,
    glossaryEnabled: true,
    characterMemoryEnabled: true,
  },
  {
    slug: "ai-standart",
    labelKey: "translationProfiles.aiStandard.label",
    descriptionKey: "translationProfiles.aiStandard.description",
    sortOrder: 20,
    isAiGenerated: true,
    isHumanReviewed: false,
    glossaryEnabled: true,
    characterMemoryEnabled: false,
  },
  {
    slug: "topluluk",
    labelKey: "translationProfiles.community.label",
    descriptionKey: "translationProfiles.community.description",
    sortOrder: 30,
    isAiGenerated: false,
    isHumanReviewed: true,
    glossaryEnabled: false,
    characterMemoryEnabled: false,
  },
] as const

const starSeriesId = "019f9000-0000-7000-8000-000000000001"
const starAssetDirectory = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "assets",
  "yildiz-postanesi",
)

async function seedStarPostOffice(
  communityProfileId: string,
  releaseGroupId: string,
) {
  const storage = getStorage()
  const assetFiles = {
    cover: { source: "cover.png", mimeType: "image/png" },
    banner: { source: "banner.jpg", mimeType: "image/jpeg" },
    page1: { source: "page-1.png", mimeType: "image/png" },
    page2: { source: "page-2.png", mimeType: "image/png" },
    page3: { source: "page-3.png", mimeType: "image/png" },
  } as const
  const assets = new Map<string, Uint8Array>()
  for (const [name, asset] of Object.entries(assetFiles)) {
    const body = await readFile(join(starAssetDirectory, asset.source))
    assets.set(name, body)
  }
  await storage.put("demo/yildiz-postanesi/cover.png", assets.get("cover")!, {
    contentType: assetFiles.cover.mimeType,
  })
  await storage.put("demo/yildiz-postanesi/banner.jpg", assets.get("banner")!, {
    contentType: assetFiles.banner.mimeType,
  })

  const series = await db.series.upsert({
    where: { slug: "yildiz-postanesi" },
    create: {
      id: starSeriesId,
      slug: "yildiz-postanesi",
      originalLanguage: "tr",
      type: "WEBTOON",
      status: "ONGOING",
      contentRating: "EVERYONE",
      publicationYear: 2026,
      coverStorageKey: "demo/yildiz-postanesi/cover.png",
      bannerStorageKey: "demo/yildiz-postanesi/banner.jpg",
      defaultAccentColor: "#486F91",
      isFeatured: true,
      isSearchable: true,
      isIndexable: true,
      publishedAt: new Date("2026-07-24T21:30:00.000Z"),
    },
    update: {
      deletedAt: null,
      status: "ONGOING",
      coverStorageKey: "demo/yildiz-postanesi/cover.png",
      bannerStorageKey: "demo/yildiz-postanesi/banner.jpg",
      isFeatured: true,
      isSearchable: true,
      isIndexable: true,
    },
  })

  for (const localization of [
    {
      locale: "tr" as const,
      title: "Yıldız Postanesi",
      shortTitle: "Yıldız Postası",
      description:
        "Gece vardiyasındaki genç kurye Lalin, adresi olmayan ışıklı bir mektubun peşinde bulut adaları arasında sıcacık bir yolculuğa çıkar.",
    },
    {
      locale: "en" as const,
      title: "The Star Post Office",
      shortTitle: "Star Mail",
      description:
        "Night-shift courier Lalin follows a glowing letter with no address on a tender journey across the cloud islands.",
    },
  ]) {
    await db.seriesLocalization.upsert({
      where: {
        seriesId_locale: { seriesId: series.id, locale: localization.locale },
      },
      create: { seriesId: series.id, ...localization },
      update: localization,
    })
  }

  const creator = await db.platformCreator.upsert({
    where: { slug: "novora-studio" },
    create: { slug: "novora-studio", name: "Novora Studio" },
    update: { name: "Novora Studio" },
  })
  await db.seriesCreator.upsert({
    where: {
      seriesId_creatorId_role: {
        seriesId: series.id,
        creatorId: creator.id,
        role: "STUDIO",
      },
    },
    create: {
      seriesId: series.id,
      creatorId: creator.id,
      role: "STUDIO",
    },
    update: {},
  })

  for (const [index, genreName] of [
    "Fantastik",
    "Gündelik Yaşam",
    "Macera",
  ].entries()) {
    const slug = genreName
      .toLocaleLowerCase("tr")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ı/g, "i")
      .replace(/[^a-z0-9]+/g, "-")
    const genre = await db.genre.upsert({
      where: { slug },
      create: { slug },
      update: {},
    })
    await db.genreLocalization.upsert({
      where: { genreId_locale: { genreId: genre.id, locale: "tr" } },
      create: { genreId: genre.id, locale: "tr", name: genreName },
      update: { name: genreName },
    })
    await db.seriesGenre.upsert({
      where: { seriesId_genreId: { seriesId: series.id, genreId: genre.id } },
      create: { seriesId: series.id, genreId: genre.id, sortOrder: index },
      update: { sortOrder: index },
    })
  }

  for (const chapterNumber of [1, 2, 3]) {
    const chapterId = `019f9000-0000-7000-8000-0000000001${String(
      chapterNumber,
    ).padStart(2, "0")}`
    const chapter = await db.platformChapter.upsert({
      where: { id: chapterId },
      create: {
        id: chapterId,
        seriesId: series.id,
        chapterNumber: String(chapterNumber),
        canonicalSlug: `bolum-${chapterNumber}`,
        sortKey: chapterNumber,
      },
      update: { deletedAt: null, sortKey: chapterNumber },
    })
    const chapterTitles = [
      ["Adresi Olmayan Mektup", "The Letter Without an Address"],
      ["Bulut Köprüsü", "The Cloud Bridge"],
      ["Yeni Bir Takımyıldız", "A New Constellation"],
    ][chapterNumber - 1]!
    for (const [locale, title] of [
      ["tr", chapterTitles[0]],
      ["en", chapterTitles[1]],
    ] as const) {
      await db.chapterLocalization.upsert({
        where: { chapterId_locale: { chapterId, locale } },
        create: { chapterId, locale, title },
        update: { title },
      })
    }

    for (const [languageIndex, targetLanguage] of ["tr", "en"].entries()) {
      const releaseId = `019f9000-0000-7000-8000-0000000002${chapterNumber}${languageIndex}`
      const storagePrefix = `demo/yildiz-postanesi/chapters/${chapterNumber}`
      const release = await db.chapterRelease.upsert({
        where: { id: releaseId },
        create: {
          id: releaseId,
          chapterId: chapter.id,
          targetLanguage: targetLanguage as "tr" | "en",
          sourceLanguage: "tr",
          translationProfileId: communityProfileId,
          releaseGroupId,
          status: "PUBLISHED",
          publishedAt: new Date("2026-07-24T21:30:00.000Z"),
          humanReviewed: true,
          overallQualityScore: targetLanguage === "tr" ? 98 : 96,
          pageCount: 3,
          storagePrefix,
          isCanonicalForLanguage: true,
          isPublic: true,
          isIndexable: false,
        },
        update: {
          deletedAt: null,
          status: "PUBLISHED",
          isPublic: true,
          pageCount: 3,
          storagePrefix,
        },
      })
      for (const pageNumber of [1, 2, 3]) {
        const storageKey = `${storagePrefix}/page-${pageNumber}.png`
        const body = assets.get(`page${pageNumber}`)!
        await storage.put(storageKey, body, { contentType: "image/png" })
        await db.releasePage.upsert({
          where: {
            releaseId_pageNumber: { releaseId: release.id, pageNumber },
          },
          create: {
            releaseId: release.id,
            pageNumber,
            storageKey,
            width: 864,
            height: 1821,
            mimeType: "image/png",
            fileSize: BigInt(body.length),
            checksum: checksum(body),
          },
          update: {
            storageKey,
            width: 864,
            height: 1821,
            mimeType: "image/png",
            fileSize: BigInt(body.length),
            checksum: checksum(body),
          },
        })
      }
    }
  }
}

export async function seedPlatform() {
  for (const profile of profiles) {
    await db.translationProfile.upsert({
      where: { slug: profile.slug },
      create: profile,
      update: profile,
    })
  }

  const releaseGroup = await db.releaseGroup.upsert({
    where: { slug: "novora-studio" },
    create: {
      slug: "novora-studio",
      name: "Novora Studio",
      type: "INTERNAL",
      verified: true,
    },
    update: { name: "Novora Studio", type: "INTERNAL", verified: true },
  })
  const profileRows = await db.translationProfile.findMany({
    where: { slug: { in: profiles.map((profile) => profile.slug) } },
  })
  const profileBySlug = new Map(
    profileRows.map((profile) => [profile.slug, profile]),
  )

  await db.series.deleteMany({
    where: { slug: { in: demoSeries.map(([slug]) => slug) } },
  })

  for (const [
    seriesIndex,
    [slug, trTitle, enTitle, type, status, originalLanguage],
  ] of demoSeries.entries()) {
    await db.series.create({
      data: {
        slug,
        originalLanguage,
        type,
        status,
        contentRating: "TEEN",
        publicationYear: 2026 - (seriesIndex % 3),
        defaultAccentColor: "#486F91",
        isFeatured: seriesIndex < 2,
        isSearchable: true,
        isIndexable: true,
        publishedAt: new Date(
          `2026-0${(seriesIndex % 6) + 1}-10T10:00:00.000Z`,
        ),
        localizations: {
          create: [
            {
              locale: "tr",
              title: trTitle,
              description: `${trTitle}, NovoraScans için hazırlanmış tamamen kurgusal bir demo seridir.`,
            },
            {
              locale: "en",
              title: enTitle,
              description: `${enTitle} is an entirely fictional demo series created for NovoraScans.`,
            },
          ],
        },
        aliases: {
          create: {
            locale: "en",
            alias: enTitle,
            normalizedAlias: slug,
            type: "ENGLISH",
          },
        },
        chapters: {
          create: [1, 2, 3].map((chapterNumber) => ({
            chapterNumber: String(chapterNumber),
            sortKey: chapterNumber,
            canonicalSlug: `chapter-${chapterNumber}`,
            originalPublishedAt: new Date(
              `2026-07-${String(10 + seriesIndex + chapterNumber).padStart(2, "0")}T10:00:00.000Z`,
            ),
            localizations: {
              create: [
                {
                  locale: "tr",
                  title: `Bölüm ${chapterNumber}`,
                  description: `${trTitle} serisinin ${chapterNumber}. demo bölümü.`,
                },
                {
                  locale: "en",
                  title: `Chapter ${chapterNumber}`,
                  description: `Fictional chapter ${chapterNumber} of ${enTitle}.`,
                },
              ],
            },
            releases: {
              create: [
                {
                  targetLanguage: "tr",
                  sourceLanguage: originalLanguage,
                  translationProfileId: profileBySlug.get("ai-ultra")!.id,
                  releaseGroupId: releaseGroup.id,
                  status: "PUBLISHED",
                  publishedAt: new Date("2026-07-20T10:00:00.000Z"),
                  humanReviewed: true,
                  glossaryUsed: true,
                  characterMemoryUsed: true,
                  overallQualityScore: 96,
                  pageCount: 4,
                  isCanonicalForLanguage: true,
                  isPublic: true,
                  isIndexable: true,
                  pages: {
                    create: [1, 2, 3, 4].map((pageNumber) => ({
                      pageNumber,
                      storageKey: `demo/reader/page-${pageNumber}.svg`,
                      width: 1200,
                      height: 1800,
                      mimeType: "image/svg+xml",
                    })),
                  },
                },
                ...(seriesIndex === 0
                  ? (["ai-standart", "topluluk"] as const).map(
                      (profileSlug, index) => ({
                        targetLanguage: "tr" as const,
                        sourceLanguage: originalLanguage,
                        translationProfileId:
                          profileBySlug.get(profileSlug)!.id,
                        releaseGroupId: releaseGroup.id,
                        status: "PUBLISHED" as const,
                        publishedAt: new Date("2026-07-20T10:00:00.000Z"),
                        humanReviewed: profileSlug === "topluluk",
                        glossaryUsed: profileSlug === "ai-standart",
                        characterMemoryUsed: false,
                        overallQualityScore: index === 0 ? 87 : 91,
                        pageCount: 4,
                        isCanonicalForLanguage: false,
                        isPublic: true,
                        isIndexable: true,
                      }),
                    )
                  : []),
                {
                  targetLanguage: "en",
                  sourceLanguage: originalLanguage,
                  translationProfileId: profileBySlug.get("ai-standart")!.id,
                  releaseGroupId: releaseGroup.id,
                  status: "PUBLISHED",
                  publishedAt: new Date("2026-07-20T10:00:00.000Z"),
                  overallQualityScore: 88,
                  pageCount: 4,
                  isCanonicalForLanguage: true,
                  isPublic: true,
                  isIndexable: true,
                },
              ],
            },
          })),
        },
      },
    })
  }

  await seedStarPostOffice(profileBySlug.get("topluluk")!.id, releaseGroup.id)
}
