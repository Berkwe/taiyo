import { db } from "@taiyomoe/db"
import Link from "next/link"
import { TranslateExperience } from "~/app/translate/translate-experience"
import { getDebugViewerRole } from "~/features/debug/viewer"
import type { Locale } from "~/features/platform/domain"
import { paths } from "~/features/platform/paths"
import { localeAlternates, pageMetadata } from "~/features/platform/seo"
import { resolveOutputLanguage } from "~/features/translation/types"
import { getSession } from "~/utils/get-session"
import { getSettings } from "~/utils/get-settings"

type SearchParameters = Record<string, string | string[] | undefined>

export async function translationLandingMetadata(
  locale: Locale,
  searchParams: Promise<SearchParameters>,
) {
  const query = await searchParams
  const parameterized = Object.keys(query).length > 0
  return pageMetadata({
    title: locale === "tr" ? "Webtoon AI Çevir" : "Translate Webtoons with AI",
    description:
      locale === "tr"
        ? "AI ile çevirmek istediğin seriyi ara, kaynağı ve bölümleri seç."
        : "Find a series to translate with AI, then choose its source and chapters.",
    canonical: paths.translate(locale),
    alternates: localeAlternates(paths.translate("tr"), paths.translate("en")),
    locale,
    noIndex: parameterized,
  })
}

export async function TranslationLandingPage({
  locale,
  searchParams,
}: {
  locale: Locale
  searchParams: Promise<SearchParameters>
}) {
  const params = await searchParams
  const query =
    typeof params.q === "string" ? params.q.trim().slice(0, 120) : ""
  const [session, settings] = await Promise.all([getSession(), getSettings()])
  const debugRole = await getDebugViewerRole()
  const authenticated =
    debugRole !== null ? debugRole !== "GUEST" : Boolean(session?.user)
  let balance = 0
  if (session?.user) {
    const account = await db.creditAccount.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id },
      update: {},
    })
    balance = account.cachedBalance
  }

  return (
    <main className="py-10 content-shell" id="main-content">
      <header className="max-w-3xl">
        <p className="font-semibold text-nv-primary text-sm uppercase tracking-[.16em]">
          {locale === "tr" ? "Novora AI Çeviri" : "Novora AI Translation"}
        </p>
        <h1 className="mt-3 font-bold text-4xl sm:text-5xl">
          {locale === "tr" ? "Webtoon AI Çevir" : "Translate Webtoons with AI"}
        </h1>
        <p className="mt-4 text-lg text-nv-muted-foreground">
          {locale === "tr"
            ? "AI ile çevirmek istediğin seriyi ara, kaynağı ve bölümleri seç."
            : "Find a series to translate with AI, then choose its source and chapters."}
        </p>
        {authenticated ? (
          <Link
            className="mt-5 inline-flex min-h-11 items-center border border-nv-border bg-surface px-4 font-semibold hover:bg-surface-raised"
            href={paths.translateRequests(locale)}
          >
            {locale === "tr" ? "Çeviri Taleplerim" : "My Translation Requests"}
          </Link>
        ) : null}
      </header>
      <div className="mt-8">
        <TranslateExperience
          authenticated={authenticated}
          balance={balance}
          initialQuery={query}
          initialQuality={
            params.quality === "premium" || params.quality === "balanced"
              ? params.quality
              : undefined
          }
          initialOutputLanguage={resolveOutputLanguage(
            typeof params.outputLanguage === "string"
              ? params.outputLanguage
              : session?.user.settings.translationLanguage,
          )}
          initialResults={[]}
          initialSelectionMode={
            params.selectionMode === "range" ? "range" : undefined
          }
          initialSeriesId={
            typeof params.seriesId === "string" ? params.seriesId : undefined
          }
          locale={locale}
          nextChapter={
            typeof params.nextChapter === "string"
              ? params.nextChapter
              : undefined
          }
          preferredSourceEditionId={
            params.chooseSource === "1"
              ? undefined
              : typeof params.sourceEditionId === "string"
                ? params.sourceEditionId
                : undefined
          }
          requireSourceChoice={params.chooseSource === "1"}
          showAdultAniListResults={settings.showAdultAniListResults}
        />
      </div>
    </main>
  )
}
