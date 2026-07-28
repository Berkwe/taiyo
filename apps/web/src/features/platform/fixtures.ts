import type {
  Chapter,
  ChapterRelease,
  Locale,
  Series,
  TranslationProfile,
} from "./domain"

export const translationProfiles: TranslationProfile[] = [
  {
    id: "profile-ai-ultra",
    slug: "ai-ultra",
    labels: { tr: "AI Ultra", en: "AI Ultra" },
    descriptions: {
      tr: "Bağlam, terim sözlüğü ve karakter hafızasıyla insan kontrolünden geçen üst kalite.",
      en: "Premium AI translation with context, glossary, character memory and human review.",
    },
    sortOrder: 10,
    isAiGenerated: true,
    isHumanReviewed: true,
  },
  {
    id: "profile-ai-standard",
    slug: "ai-standart",
    labels: { tr: "AI Standart", en: "AI Standard" },
    descriptions: {
      tr: "Hızlı yayın için otomatik kalite kontrollerinden geçen dengeli çeviri.",
      en: "Balanced translation with automated quality checks for faster releases.",
    },
    sortOrder: 20,
    isAiGenerated: true,
    isHumanReviewed: false,
  },
  {
    id: "profile-community",
    slug: "topluluk",
    labels: { tr: "Topluluk", en: "Community" },
    descriptions: {
      tr: "Topluluk çevirmenleri ve editörleri tarafından hazırlanan sürüm.",
      en: "A release prepared by community translators and editors.",
    },
    sortOrder: 30,
    isAiGenerated: false,
    isHumanReviewed: true,
  },
  {
    id: "profile-official",
    slug: "official",
    labels: { tr: "Resmî", en: "Official" },
    descriptions: {
      tr: "Hak sahibi veya lisanslı yayın ortağı tarafından sağlanan sürüm.",
      en: "A release supplied by the rights holder or licensed publishing partner.",
    },
    sortOrder: 5,
    isAiGenerated: false,
    isHumanReviewed: true,
  },
]

const pages = (label: string) =>
  [1, 2, 3, 4].map((pageNumber) => ({
    pageNumber,
    src: `/demo/reader/page-${pageNumber}.svg`,
    width: 1200,
    height: 1800,
    alt: `${label}, sayfa ${pageNumber}`,
  }))

const release = (
  id: string,
  profileId: string,
  targetLanguage: Locale,
  score: number,
  canonical = false,
): ChapterRelease => {
  const seriesId = id.split("-ch")[0] ?? id
  const sourceKind = profileId.includes("community")
    ? "ko-primary"
    : id.includes("standard-tr")
      ? "en-alternative"
      : "en-primary"
  const sourceLanguage = sourceKind.startsWith("en") ? "en" : "ko"
  const primary = sourceKind.endsWith("primary")
  const profile = translationProfiles.find((item) => item.id === profileId)
  return {
    id,
    targetLanguage,
    sourceLanguage,
    source: {
      id: `${seriesId}-source-${sourceKind}`,
      sourceLanguage,
      descriptions:
        sourceLanguage === "en"
          ? {
              tr: primary
                ? "Kaliteli, insan eliyle hazırlanmış İngilizce kaynak."
                : "Alternatif İngilizce kaynak.",
              en: primary
                ? "High-quality English source prepared by human editors."
                : "Alternative English source.",
            }
          : {
              tr: "Doğrudan kaliteli Korece kaynak.",
              en: "High-quality source directly from Korean.",
            },
      priority: primary ? 100 : 50,
      isDefault: canonical,
    },
    qualityTier: profileId === "profile-ai-ultra" ? "premium" : "balanced",
    translationType: profile?.isAiGenerated
      ? "ai"
      : profile?.isHumanReviewed
        ? "human"
        : "unknown",
    isActive: true,
    pipelineVersion: profileId === "profile-ai-ultra" ? "v2-premium" : "v1",
    profileId,
    revision: 1,
    releaseGroup: targetLanguage === "tr" ? "Novora Studio" : "Northstar Press",
    publishedAt: "2026-07-20T10:00:00.000Z",
    humanReviewed: profileId !== "profile-ai-standard",
    glossaryUsed: profileId.includes("ai"),
    characterMemoryUsed: profileId === "profile-ai-ultra",
    overallQualityScore: score,
    isCanonicalForLanguage: canonical,
    isIndexable: true,
    pages: pages(id),
  }
}

const chapters = (slug: string, multiProfile = false): Chapter[] =>
  [1, 2, 3].map((chapterNumber) => {
    const base = [
      release(
        `${slug}-ch${chapterNumber}-ultra-tr`,
        "profile-ai-ultra",
        "tr",
        96,
        true,
      ),
      release(
        `${slug}-ch${chapterNumber}-standard-en`,
        "profile-ai-standard",
        "en",
        88,
        true,
      ),
    ]
    if (multiProfile) {
      base.splice(
        1,
        0,
        release(
          `${slug}-ch${chapterNumber}-standard-tr`,
          "profile-ai-standard",
          "tr",
          87,
        ),
        release(
          `${slug}-ch${chapterNumber}-community-tr`,
          "profile-community",
          "tr",
          91,
        ),
      )
    }
    return {
      id: `${slug}-chapter-${chapterNumber}`,
      number: String(chapterNumber),
      sortKey: chapterNumber,
      canonicalSlug: `bolum-${chapterNumber}`,
      localizations: {
        tr: {
          title:
            chapterNumber === 1
              ? "İlk Kıvılcım"
              : `Yol Ayrımı ${chapterNumber}`,
          description: `Hikâyenin ${chapterNumber}. bölümünde yeni sırlar ortaya çıkıyor.`,
        },
        en: {
          title:
            chapterNumber === 1
              ? "The First Spark"
              : `Crossroads ${chapterNumber}`,
          description: `New secrets surface in chapter ${chapterNumber}.`,
        },
      },
      publishedAt: `2026-07-${String(21 - chapterNumber).padStart(2, "0")}T10:00:00.000Z`,
      releases: base,
    }
  })

const makeSeries = (
  input: Omit<
    Series,
    "chapters" | "isSearchable" | "isIndexable" | "contentRating"
  > & {
    multiProfile?: boolean
  },
): Series => ({
  ...input,
  contentRating: "TEEN",
  isSearchable: true,
  isIndexable: true,
  chapters: chapters(input.slug, input.multiProfile),
})

export const seriesFixtures: Series[] = [
  makeSeries({
    id: "series-echoes",
    slug: "gece-ekolari",
    originalLanguage: "ko",
    type: "WEBTOON",
    status: "ONGOING",
    publicationYear: 2026,
    updatedAt: "2026-07-22T16:00:00.000Z",
    publishedAt: "2026-04-10T10:00:00.000Z",
    accentColor: "#486F91",
    isFeatured: true,
    popularity: 98,
    localizations: {
      tr: {
        title: "Gece Ekoları",
        shortTitle: "Ekolar",
        description:
          "Seslerin anıya dönüştüğü kıyı kentinde bir arşivci, kayıp kardeşinin yankısını izler.",
      },
      en: {
        title: "Echoes After Midnight",
        shortTitle: "Echoes",
        description:
          "In a coastal city where sound becomes memory, an archivist follows the echo of her missing brother.",
      },
    },
    aliases: ["Midnight Echoes", "Bamui Ullim"],
    creators: [
      { name: "Derya K.", role: "Yazar" },
      { name: "Mina Park", role: "Çizer" },
    ],
    genres: ["Gizem", "Fantastik"],
    tags: ["Şehir", "Kayıp anılar"],
    cover: "/demo/covers/echoes.svg",
    banner: "/demo/banner.svg",
    multiProfile: true,
  }),
  makeSeries({
    id: "series-orbit",
    slug: "kirik-yorunge",
    originalLanguage: "ja",
    type: "MANGA",
    status: "COMPLETED",
    publicationYear: 2024,
    updatedAt: "2026-07-19T10:00:00.000Z",
    publishedAt: "2025-11-02T10:00:00.000Z",
    accentColor: "#486F91",
    isFeatured: false,
    popularity: 91,
    localizations: {
      tr: {
        title: "Kırık Yörünge",
        description:
          "Emekli bir pilot, parçalanan ay istasyonundaki son kurtarma görevine çağrılır.",
      },
      en: {
        title: "Fractured Orbit",
        description:
          "A retired pilot is called into one last rescue mission on a fractured lunar station.",
      },
    },
    aliases: ["Orbit 9"],
    creators: [{ name: "Akira Mori", role: "Yazar ve çizer" }],
    genres: ["Bilim Kurgu", "Dram"],
    tags: ["Uzay", "Hayatta kalma"],
    cover: "/demo/covers/orbit.svg",
  }),
  makeSeries({
    id: "series-garden",
    slug: "cam-bahce",
    originalLanguage: "ko",
    type: "MANHWA",
    status: "ONGOING",
    publicationYear: 2025,
    updatedAt: "2026-07-21T12:00:00.000Z",
    publishedAt: "2026-01-14T10:00:00.000Z",
    accentColor: "#486F91",
    isFeatured: true,
    popularity: 89,
    localizations: {
      tr: {
        title: "Cam Bahçe",
        description:
          "Bitkilerin sır sakladığı bir sarayda genç botanikçi gerçeğin izini sürer.",
      },
      en: {
        title: "The Glass Garden",
        description:
          "A young botanist hunts for truth in a palace where plants keep secrets.",
      },
    },
    aliases: ["Glasshouse"],
    creators: [
      { name: "Seo Yuna", role: "Yazar" },
      { name: "Han Sol", role: "Çizer" },
    ],
    genres: ["Romantik", "Fantastik"],
    tags: ["Saray", "Botanik"],
    cover: "/demo/covers/garden.svg",
  }),
  makeSeries({
    id: "series-river",
    slug: "sessiz-nehir",
    originalLanguage: "zh",
    type: "MANHUA",
    status: "HIATUS",
    publicationYear: 2023,
    updatedAt: "2026-07-13T08:00:00.000Z",
    publishedAt: "2025-08-09T10:00:00.000Z",
    accentColor: "#486F91",
    isFeatured: false,
    popularity: 77,
    localizations: {
      tr: {
        title: "Sessiz Nehir",
        description:
          "Haritalarda görünmeyen bir nehir, iki gezgini unutulmuş bir krallığa taşır.",
      },
      en: {
        title: "The Silent River",
        description:
          "A river absent from every map carries two travellers to a forgotten kingdom.",
      },
    },
    aliases: ["Wu Sheng He"],
    creators: [{ name: "Lin Yue", role: "Yazar" }],
    genres: ["Macera", "Fantastik"],
    tags: ["Yolculuk", "Mitoloji"],
    cover: "/demo/covers/river.svg",
  }),
  makeSeries({
    id: "series-signal",
    slug: "son-sinyal",
    originalLanguage: "en",
    type: "COMIC",
    status: "ONGOING",
    publicationYear: 2026,
    updatedAt: "2026-07-20T18:00:00.000Z",
    publishedAt: "2026-05-01T10:00:00.000Z",
    accentColor: "#486F91",
    isFeatured: false,
    popularity: 84,
    localizations: {
      tr: {
        title: "Son Sinyal",
        description:
          "Dünyanın son radyo sunucusu, boşluktan gelen imkânsız bir cevabı duyar.",
      },
      en: {
        title: "The Last Signal",
        description:
          "Earth's last radio host hears an impossible answer from the void.",
      },
    },
    aliases: ["Signal Zero"],
    creators: [{ name: "Iris Vale", role: "Yazar ve çizer" }],
    genres: ["Gerilim", "Bilim Kurgu"],
    tags: ["Radyo", "Kıyamet sonrası"],
    cover: "/demo/covers/signal.svg",
  }),
  makeSeries({
    id: "series-teahouse",
    slug: "bulut-cayevi",
    originalLanguage: "tr",
    type: "LIGHT_NOVEL",
    status: "COMPLETED",
    publicationYear: 2025,
    updatedAt: "2026-07-17T09:00:00.000Z",
    publishedAt: "2025-09-18T10:00:00.000Z",
    accentColor: "#486F91",
    isFeatured: false,
    popularity: 73,
    localizations: {
      tr: {
        title: "Bulut Çayevi",
        description:
          "Her fincanın farklı bir geleceği gösterdiği küçük bir çayevinin sıcak öyküleri.",
      },
      en: {
        title: "The Cloud Teahouse",
        description:
          "Warm stories from a tiny teahouse where every cup reveals a different future.",
      },
    },
    aliases: ["Tea Above the Clouds"],
    creators: [{ name: "Nehir Aydın", role: "Yazar" }],
    genres: ["Gündelik Yaşam", "Fantastik"],
    tags: ["Rahatlatıcı", "Yemek"],
    cover: "/demo/covers/teahouse.svg",
  }),
  {
    id: "series-star-post-office",
    slug: "yildiz-postanesi",
    originalLanguage: "tr",
    type: "WEBTOON",
    status: "ONGOING",
    contentRating: "EVERYONE",
    publicationYear: 2026,
    updatedAt: "2026-07-24T21:30:00.000Z",
    publishedAt: "2026-07-24T21:30:00.000Z",
    accentColor: "#486F91",
    isFeatured: true,
    isSearchable: true,
    isIndexable: true,
    popularity: 99,
    localizations: {
      tr: {
        title: "Yıldız Postanesi",
        shortTitle: "Yıldız Postası",
        description:
          "Gece vardiyasındaki genç kurye Lalin, adresi olmayan ışıklı bir mektubun peşinde bulut adaları arasında sıcacık bir yolculuğa çıkar.",
      },
      en: {
        title: "The Star Post Office",
        shortTitle: "Star Mail",
        description:
          "Night-shift courier Lalin follows a glowing letter with no address on a tender journey across the cloud islands.",
      },
    },
    aliases: ["The Star Post Office", "Star Mail"],
    creators: [{ name: "Novora Studio", role: "Yazar ve çizer" }],
    genres: ["Fantastik", "Gündelik Yaşam", "Macera"],
    tags: ["Rahatlatıcı", "Bulut adaları", "Postacılık"],
    cover: "/api/storage/demo/yildiz-postanesi/cover.png",
    banner: "/api/storage/demo/yildiz-postanesi/banner.jpg",
    chapters: [1, 2, 3].map((chapterNumber) => ({
      id: `star-post-office-chapter-${chapterNumber}`,
      number: String(chapterNumber),
      sortKey: chapterNumber,
      canonicalSlug: `bolum-${chapterNumber}`,
      localizations: {
        tr: {
          title:
            chapterNumber === 1
              ? "Adresi Olmayan Mektup"
              : chapterNumber === 2
                ? "Bulut Köprüsü"
                : "Yeni Bir Takımyıldız",
          description: `Lalin'in yıldız postası yolculuğunun ${chapterNumber}. bölümü.`,
        },
        en: {
          title:
            chapterNumber === 1
              ? "The Letter Without an Address"
              : chapterNumber === 2
                ? "The Cloud Bridge"
                : "A New Constellation",
          description: `Chapter ${chapterNumber} of Lalin's star-mail journey.`,
        },
      },
      publishedAt: `2026-07-${24 - chapterNumber}T21:30:00.000Z`,
      releases: [
        {
          id: `star-post-office-ch${chapterNumber}-tr`,
          targetLanguage: "tr",
          sourceLanguage: "tr",
          source: {
            id: "star-post-office-source-tr-primary",
            sourceLanguage: "tr",
            descriptions: {
              tr: "Novora için hazırlanmış özgün Türkçe kaynak.",
              en: "Original Turkish source prepared for Novora.",
            },
            priority: 100,
            isDefault: true,
          },
          qualityTier: "premium",
          translationType: "ai",
          isActive: true,
          pipelineVersion: "v2-premium",
          profileId: "profile-community",
          revision: 1,
          releaseGroup: "Novora Studio",
          publishedAt: `2026-07-${24 - chapterNumber}T21:30:00.000Z`,
          humanReviewed: true,
          glossaryUsed: false,
          characterMemoryUsed: false,
          overallQualityScore: 98,
          isCanonicalForLanguage: true,
          isIndexable: false,
          pages: [1, 2, 3].map((pageNumber) => {
            const storageKey = `demo/yildiz-postanesi/chapters/${chapterNumber}/page-${pageNumber}.png`
            return {
              pageNumber,
              storageKey,
              src: `/api/storage/${storageKey}`,
              width: 864,
              height: 1821,
              alt: `Yıldız Postanesi, bölüm ${chapterNumber}, sayfa ${pageNumber}`,
            }
          }),
        },
        {
          id: `star-post-office-ch${chapterNumber}-en`,
          targetLanguage: "en",
          sourceLanguage: "tr",
          source: {
            id: "star-post-office-source-tr-primary",
            sourceLanguage: "tr",
            descriptions: {
              tr: "Novora için hazırlanmış özgün Türkçe kaynak.",
              en: "Original Turkish source prepared for Novora.",
            },
            priority: 100,
            isDefault: true,
          },
          qualityTier: "balanced",
          translationType: "ai",
          isActive: true,
          pipelineVersion: "v1",
          profileId: "profile-community",
          revision: 1,
          releaseGroup: "Novora Studio",
          publishedAt: `2026-07-${24 - chapterNumber}T21:30:00.000Z`,
          humanReviewed: true,
          glossaryUsed: false,
          characterMemoryUsed: false,
          overallQualityScore: 96,
          isCanonicalForLanguage: true,
          isIndexable: false,
          pages: [1, 2, 3].map((pageNumber) => {
            const storageKey = `demo/yildiz-postanesi/chapters/${chapterNumber}/page-${pageNumber}.png`
            return {
              pageNumber,
              storageKey,
              src: `/api/storage/${storageKey}`,
              width: 864,
              height: 1821,
              alt: `The Star Post Office, chapter ${chapterNumber}, page ${pageNumber}`,
            }
          }),
        },
      ],
    })),
  },
]

export const getProfile = (id: string) =>
  translationProfiles.find((profile) => profile.id === id)

export const getSeries = (slug: string) =>
  seriesFixtures.find((series) => series.slug === slug)

export const getChapter = (series: Series, chapterNumber: string) =>
  series.chapters.find((chapter) => chapter.number === chapterNumber)

export const getRelease = (chapter: Chapter, releaseId: string) =>
  chapter.releases.find((releaseItem) => releaseItem.id === releaseId)
