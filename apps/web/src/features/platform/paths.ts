import type { Locale } from "./domain"

const segments = {
  tr: {
    discover: "kesfet",
    search: "arama",
    series: "seri",
    chapter: "bolum",
    read: "oku",
    genre: "tur",
    profile: "profil",
    about: "hakkimizda",
    market: "market",
  },
  en: {
    discover: "discover",
    search: "search",
    series: "series",
    chapter: "chapter",
    read: "read",
    genre: "genre",
    profile: "profile",
    about: "about",
    market: "market",
  },
} as const

export const paths = {
  home: (locale: Locale) => `/${locale}`,
  discover: (locale: Locale) => `/${locale}/${segments[locale].discover}`,
  search: (locale: Locale, query = "") =>
    `/${locale}/${segments[locale].search}${query ? `?q=${encodeURIComponent(query)}` : ""}`,
  series: (locale: Locale, slug: string) =>
    `/${locale}/${segments[locale].series}/${slug}`,
  chapter: (locale: Locale, slug: string, chapter: string) =>
    `/${locale}/${segments[locale].series}/${slug}/${segments[locale].chapter}/${chapter}`,
  reader: (locale: Locale, slug: string, chapter: string, releaseId: string) =>
    `/${locale}/${segments[locale].read}/${slug}/${chapter}/${releaseId}`,
  genre: (locale: Locale, genre: string) =>
    `/${locale}/${segments[locale].genre}/${slugify(genre)}`,
  profile: (locale: Locale) => `/${locale}/${segments[locale].profile}`,
  about: (locale: Locale) => `/${locale}/${segments[locale].about}`,
  market: (locale: Locale) => `/${locale}/${segments[locale].market}`,
}

export const slugify = (value: string) =>
  value
    .toLocaleLowerCase("tr")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
