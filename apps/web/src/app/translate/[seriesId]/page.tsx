import { db } from "@taiyomoe/db"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { z } from "zod"
import { AppHeader } from "~/components/platform/app-header"
import { Footer } from "~/components/platform/footer"
import { getDebugViewerRole } from "~/features/debug/viewer"
import { getSourceCatalogProvider } from "~/features/translation/provider"
import { resolveOutputLanguage } from "~/features/translation/types"
import { getSession } from "~/utils/get-session"
import { TranslateExperience } from "../translate-experience"

export const metadata: Metadata = {
  title: "Seri AI çevirisi",
  description: "Kaynağı, bölümleri ve AI çeviri kalitesini seç.",
  robots: { index: false, follow: true },
}

export default async function TranslationSeriesPage({
  params,
  searchParams,
}: {
  params: Promise<{ seriesId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { seriesId } = await params
  if (!z.string().uuid().safeParse(seriesId).success) notFound()
  const query = await searchParams
  const series = await getSourceCatalogProvider().getSeriesDetails(seriesId)
  if (!series) notFound()

  const session = await getSession()
  const debugRole = await getDebugViewerRole()
  const authenticated =
    debugRole !== null ? debugRole !== "GUEST" : Boolean(session?.user)
  let balance = 0
  let preferredSourceEditionId: string | undefined
  if (session?.user) {
    const [account, preference] = await Promise.all([
      db.creditAccount.upsert({
        where: { userId: session.user.id },
        create: { userId: session.user.id },
        update: {},
      }),
      db.translationSourcePreference.findUnique({
        where: {
          userId_canonicalKey: {
            userId: session.user.id,
            canonicalKey: series.canonicalKey,
          },
        },
      }),
    ])
    balance = account.cachedBalance
    preferredSourceEditionId = preference?.sourceEditionId
  }
  const requestedSourceEditionId =
    query.chooseSource === "1"
      ? undefined
      : typeof query.sourceEditionId === "string"
        ? query.sourceEditionId
        : preferredSourceEditionId
  const continuationEdition =
    series.editions.find(
      (edition) => edition.id === requestedSourceEditionId,
    ) ??
    [...series.editions].sort(
      (left, right) =>
        Number(right.sourceLanguage === "en") -
          Number(left.sourceLanguage === "en") ||
        right.priority - left.priority,
    )[0]
  const latestPublishedChapter = series.canonicalSeriesId
    ? await db.platformChapter.findFirst({
        where: {
          seriesId: series.canonicalSeriesId,
          deletedAt: null,
          releases: {
            some: {
              status: "PUBLISHED",
              isPublic: true,
              isActive: true,
              deletedAt: null,
            },
          },
        },
        orderBy: { sortKey: "desc" },
        select: { sortKey: true },
      })
    : null
  const continuationChapter = continuationEdition?.chapters.find(
    (chapter) => chapter.sortKey > (latestPublishedChapter?.sortKey ?? -1),
  )

  return (
    <>
      <AppHeader locale="tr" />
      <main className="py-10 content-shell" id="main-content">
        {session?.user ? (
          <Link
            className="mb-6 inline-flex min-h-11 items-center border border-nv-border bg-surface px-4 font-semibold hover:bg-surface-raised"
            href="/translate/serilerim"
          >
            Çeviri Taleplerim
          </Link>
        ) : null}
        <TranslateExperience
          authenticated={authenticated}
          balance={balance}
          detailMode
          initialQuery={series.title}
          initialQuality={
            query.quality === "premium" || query.quality === "balanced"
              ? query.quality
              : undefined
          }
          initialOutputLanguage={resolveOutputLanguage(
            typeof query.outputLanguage === "string"
              ? query.outputLanguage
              : session?.user.settings.translationLanguage,
          )}
          initialResults={[series]}
          initialSelectionMode={
            query.selectionMode === "range" ? "range" : undefined
          }
          initialSeriesId={series.id}
          nextChapter={
            typeof query.nextChapter === "string"
              ? query.nextChapter
              : continuationChapter?.number
          }
          preferredSourceEditionId={requestedSourceEditionId}
        />
      </main>
      <Footer locale="tr" />
    </>
  )
}
