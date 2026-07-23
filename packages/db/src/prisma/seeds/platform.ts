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
                      assetUrl: `/demo/reader/page-${pageNumber}.svg`,
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
}
