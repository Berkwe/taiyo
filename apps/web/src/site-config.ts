export const siteConfig = {
  name: "NovoraScans",
  shortName: "Novora",
  description:
    "Farklı çeviri kalite profilleriyle Türkçe webtoon, manga ve manhwa okuma platformu.",
  baseUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  social: {},
  contact: "hello@novorascans.example",
  legal: {
    privacy: "/tr/gizlilik",
    terms: "/tr/kullanim-kosullari",
    copyright: "/tr/telif",
    contact: "/tr/iletisim",
  },
  theme: {
    defaultMode: "system",
    defaultAccent: "#486F91",
  },
  i18n: {
    availableLocales: ["tr", "en"],
    defaultLocale: "tr",
    cookie: {
      name: "Language",
      maxAge: 60 * 60 * 24 * 7,
    },
  },
  sidebar: {
    cookie: {
      name: "Sidebar",
      maxAge: 60 * 60 * 24 * 7,
    },
  },
  settings: {
    cookie: {
      name: "Settings",
      maxAge: 60 * 60 * 24 * 7,
    },
  },
} as const
