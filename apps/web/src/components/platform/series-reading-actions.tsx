"use client"

import { ArrowDownUp, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import type {
  Locale,
  ReadingProgress,
  Series,
} from "~/features/platform/domain"
import { getProfile } from "~/features/platform/fixtures"
import { paths } from "~/features/platform/paths"
import { TranslationProfileBadge } from "./content"
import { PROGRESS_KEY_PREFIX, parseProgress } from "./continue-reading-card"

function progressFor(series: Series) {
  const entries = new Map<string, ReadingProgress>()
  for (const chapter of series.chapters) {
    const value = parseProgress(
      localStorage.getItem(
        `${PROGRESS_KEY_PREFIX}${series.slug}:${chapter.number}`,
      ),
    )
    if (value) entries.set(chapter.number, value)
  }
  return entries
}

export function SeriesReadingActions({
  locale,
  series,
}: {
  locale: Locale
  series: Series
}) {
  const [oldestFirst, setOldestFirst] = useState(false)
  const [progress, setProgress] = useState<Map<string, ReadingProgress>>(
    new Map(),
  )
  useEffect(() => {
    const local = progressFor(series)
    setProgress(local)
    async function synchronize() {
      try {
        const response = await fetch("/api/reading-progress")
        if (!response.ok) return
        const payload = (await response.json()) as {
          authenticated: boolean
          entries: Array<{
            seriesSlug: string
            chapterNumber: string
            profileSlug: string
            targetLanguage: Locale
            pageNumber: number
            scrollRatio: number
            updatedAt: string
            completedAt?: string
          }>
        }
        if (payload.authenticated) {
          await Promise.all(
            [...local.entries()].map(async ([chapterNumber, item]) => {
              const chapter = series.chapters.find(
                (candidate) => candidate.number === chapterNumber,
              )
              const release = chapter?.releases.find(
                (candidate) => candidate.id === item.releaseId,
              )
              if (!chapter || !release) return
              await fetch("/api/reading-progress", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  seriesSlug: series.slug,
                  chapterNumber,
                  profileSlug:
                    getProfile(release.profileId)?.slug ?? release.profileId,
                  targetLanguage: release.targetLanguage,
                  pageNumber: item.pageNumber,
                  scrollRatio: item.scrollRatio,
                  completed: Boolean(item.completedAt),
                }),
              })
            }),
          )
        }
        const merged = new Map(local)
        for (const item of payload.entries) {
          if (item.seriesSlug !== series.slug || item.targetLanguage !== locale)
            continue
          const chapter = series.chapters.find(
            (candidate) => candidate.number === item.chapterNumber,
          )
          const release = chapter?.releases.find(
            (candidate) =>
              candidate.targetLanguage === item.targetLanguage &&
              getProfile(candidate.profileId)?.slug === item.profileSlug,
          )
          if (!chapter || !release) continue
          const remote: ReadingProgress = {
            releaseId: release.id,
            chapterId: chapter.id,
            pageNumber: item.pageNumber,
            scrollRatio: item.scrollRatio,
            updatedAt: item.updatedAt,
            completedAt: item.completedAt,
          }
          const current = merged.get(chapter.number)
          if (!current || remote.updatedAt > current.updatedAt) {
            merged.set(chapter.number, remote)
            localStorage.setItem(
              `${PROGRESS_KEY_PREFIX}${series.slug}:${chapter.number}`,
              JSON.stringify(remote),
            )
          }
        }
        setProgress(merged)
      } catch {
        // Local reading remains available when synchronization is unavailable.
      }
    }
    void synchronize()
  }, [locale, series])

  const chapters = useMemo(
    () =>
      [...series.chapters].sort((left, right) =>
        oldestFirst
          ? left.sortKey - right.sortKey
          : right.sortKey - left.sortKey,
      ),
    [oldestFirst, series.chapters],
  )
  const firstChapter = [...series.chapters].sort(
    (left, right) => left.sortKey - right.sortKey,
  )[0]
  const firstRelease =
    firstChapter?.releases.find(
      (release) =>
        release.targetLanguage === locale && release.isCanonicalForLanguage,
    ) ??
    firstChapter?.releases.find((release) => release.targetLanguage === locale)
  const latestProgress = [...progress.entries()].sort(([, left], [, right]) =>
    right.updatedAt.localeCompare(left.updatedAt),
  )[0]
  const continueChapter = latestProgress
    ? series.chapters.find((chapter) => chapter.number === latestProgress[0])
    : undefined

  return (
    <>
      <div className="mt-6 flex flex-wrap gap-3">
        {firstChapter && firstRelease ? (
          <Link
            className="inline-flex min-h-12 items-center rounded-full bg-accent px-6 font-semibold text-accent-foreground hover:opacity-90"
            href={paths.reader(
              locale,
              series.slug,
              firstChapter.number,
              firstRelease.id,
            )}
          >
            {locale === "tr" ? "Baştan başla" : "Start from the beginning"}
          </Link>
        ) : null}
        {latestProgress && continueChapter ? (
          <Link
            className="inline-flex min-h-12 items-center border border-nv-border bg-surface px-6 font-semibold hover:bg-surface-raised"
            href={paths.reader(
              locale,
              series.slug,
              continueChapter.number,
              latestProgress[1].releaseId,
            )}
          >
            {locale === "tr" ? "Kaldığın yerden devam et" : "Continue reading"}{" "}
            · %{Math.round(latestProgress[1].scrollRatio * 100)}
          </Link>
        ) : null}
      </div>

      <section aria-labelledby="chapters-title" className="mt-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-2xl" id="chapters-title">
            {locale === "tr" ? "Bölümler" : "Chapters"}
          </h2>
          <button
            aria-pressed={oldestFirst}
            className="inline-flex min-h-11 items-center gap-2 border border-nv-border px-3 font-semibold text-sm hover:bg-surface-raised"
            onClick={() => setOldestFirst((value) => !value)}
            type="button"
          >
            <ArrowDownUp aria-hidden="true" size={17} />
            {oldestFirst
              ? locale === "tr"
                ? "En eski önce"
                : "Oldest first"
              : locale === "tr"
                ? "En yeni önce"
                : "Newest first"}
          </button>
        </div>
        <ol className="mt-5 divide-y divide-nv-border border-nv-border border-y">
          {chapters.map((chapter) => {
            const chapterProgress = progress.get(chapter.number)
            const releases = chapter.releases.filter(
              (release) => release.targetLanguage === locale,
            )
            return (
              <li
                className={chapterProgress ? "bg-nv-primary-soft" : undefined}
                key={chapter.id}
              >
                <Link
                  className="grid gap-3 py-5 hover:bg-surface md:grid-cols-[1fr_auto] md:items-center md:px-4"
                  href={paths.chapter(locale, series.slug, chapter.number)}
                >
                  <span>
                    <strong className="inline-flex items-center gap-2">
                      {chapterProgress ? (
                        <CheckCircle2
                          aria-label={locale === "tr" ? "Okundu" : "Read"}
                          className="text-nv-success"
                          size={18}
                        />
                      ) : null}
                      {locale === "tr" ? "Bölüm" : "Chapter"} {chapter.number}
                    </strong>
                    <small className="mt-1 block text-nv-muted-foreground">
                      {chapter.localizations[locale].title}
                      {chapterProgress
                        ? ` · %${Math.round(chapterProgress.scrollRatio * 100)}`
                        : ""}
                    </small>
                  </span>
                  <span className="flex flex-wrap gap-2">
                    {releases.map((release) => (
                      <TranslationProfileBadge
                        locale={locale}
                        profileId={release.profileId}
                        recommended={release.isCanonicalForLanguage}
                        key={release.id}
                      />
                    ))}
                  </span>
                </Link>
              </li>
            )
          })}
        </ol>
      </section>
    </>
  )
}
