import type { Locale } from "./domain"

export const copy = {
  tr: {
    nav: { home: "Ana sayfa", discover: "Keşfet", search: "Ara" },
    hero: {
      eyebrow: "Çeviri kalitesi, görünür ve seçilebilir",
      title: "Türkçe webtoon, manga ve manhwa okumanın yeni yolu",
      description:
        "Aynı bölümü AI Ultra, AI Standart veya topluluk sürümüyle okuyun. Hangi kaliteyi seçtiğinizi bilin.",
      primary: "Serileri keşfet",
      secondary: "Kalite profilleri",
    },
    sections: {
      latest: "Son eklenen bölümler",
      trending: "Trend seriler",
      quality: "Yüksek kaliteli AI çeviriler",
      new: "Yeni seriler",
      genres: "Türlere göre keşfet",
    },
    discover: {
      title: "Serileri keşfet",
      description: "Format, durum, dil ve çeviri kalitesine göre filtreleyin.",
      search: "Başlık, yazar veya tür ara",
      allTypes: "Tüm formatlar",
      allStatuses: "Tüm durumlar",
      popular: "Popülerlik",
      updated: "Son güncelleme",
      submit: "Filtrele",
      empty: "Bu filtrelerle eşleşen seri bulunamadı.",
    },
    series: {
      chapters: "Bölümler",
      start: "Okumaya başla",
      aliases: "Alternatif adlar",
      creators: "Ekip",
      recommended: "Önerilen",
      profiles: "Dil ve çeviri sürümleri",
    },
    chapter: {
      available: "Kullanılabilir sürümler",
      read: "Okumaya başla",
      previous: "Önceki bölüm",
      next: "Sonraki bölüm",
    },
    reader: {
      back: "Bölüm bilgisine dön",
      background: "Okuyucu arka planı",
      progress: "Okuma ilerlemesi",
    },
    common: { viewAll: "Tümünü gör", results: "sonuç" },
  },
  en: {
    nav: { home: "Home", discover: "Discover", search: "Search" },
    hero: {
      eyebrow: "Translation quality you can see and choose",
      title: "A better way to read webtoons, manga and manhwa",
      description:
        "Read the same chapter in AI Ultra, AI Standard or Community editions. Always know which quality you selected.",
      primary: "Discover series",
      secondary: "Quality profiles",
    },
    sections: {
      latest: "Latest chapters",
      trending: "Trending series",
      quality: "High-quality AI translations",
      new: "New series",
      genres: "Explore by genre",
    },
    discover: {
      title: "Discover series",
      description:
        "Filter by format, status, language and translation quality.",
      search: "Search title, creator or genre",
      allTypes: "All formats",
      allStatuses: "All statuses",
      popular: "Popularity",
      updated: "Recently updated",
      submit: "Filter",
      empty: "No series match these filters.",
    },
    series: {
      chapters: "Chapters",
      start: "Start reading",
      aliases: "Alternative titles",
      creators: "Creators",
      recommended: "Recommended",
      profiles: "Languages and translation editions",
    },
    chapter: {
      available: "Available editions",
      read: "Start reading",
      previous: "Previous chapter",
      next: "Next chapter",
    },
    reader: {
      back: "Back to chapter details",
      background: "Reader background",
      progress: "Reading progress",
    },
    common: { viewAll: "View all", results: "results" },
  },
} as const satisfies Record<Locale, object>
