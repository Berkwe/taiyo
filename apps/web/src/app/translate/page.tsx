import { db } from "@taiyomoe/db"
import type { Metadata } from "next"
import Link from "next/link"
import { AppHeader } from "~/components/platform/app-header"
import { Footer } from "~/components/platform/footer"
import { getDebugViewerRole } from "~/features/debug/viewer"
import { resolveOutputLanguage } from "~/features/translation/types"
import { getSession } from "~/utils/get-session"
import { TranslateExperience } from "./translate-experience"

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}): Promise<Metadata> {
  const query = await searchParams
  const parameterized = Object.keys(query).length > 0
  return {
    title: "Webtoon AI Çevir",
    description:
      "AI ile çevirmek istediğin seriyi ara, kaynağı ve bölümleri seç.",
    alternates: { canonical: "/translate" },
    robots: parameterized ? { index: false, follow: true } : undefined,
  }
}

export default async function TranslatePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const query =
    typeof params.q === "string" ? params.q.trim().slice(0, 120) : ""
  const session = await getSession()
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
    <>
      <AppHeader locale="tr" />
      <main className="py-10 content-shell" id="main-content">
        <header className="max-w-3xl">
          <p className="font-semibold text-nv-primary text-sm uppercase tracking-[.16em]">
            Novora AI Çeviri
          </p>
          <h1 className="mt-3 font-bold text-4xl sm:text-5xl">
            Webtoon AI Çevir
          </h1>
          <p className="mt-4 text-lg text-nv-muted-foreground">
            AI ile çevirmek istediğin seriyi ara, kaynağı ve bölümleri seç.
          </p>
          {authenticated ? (
            <Link
              className="mt-5 inline-flex min-h-11 items-center border border-nv-border bg-surface px-4 font-semibold hover:bg-surface-raised"
              href="/translate/serilerim"
            >
              Çeviri Taleplerim
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
          />
        </div>
      </main>
      <Footer locale="tr" />
    </>
  )
}
