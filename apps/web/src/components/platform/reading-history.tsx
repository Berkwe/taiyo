"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import type { Locale, ReadingProgress } from "~/features/platform/domain"
import { getChapter, getProfile, getSeries } from "~/features/platform/fixtures"
import { paths } from "~/features/platform/paths"
import { PROGRESS_KEY_PREFIX, parseProgress } from "./continue-reading-card"

interface HistoryEntry extends ReadingProgress {
  storageKey?: string
  seriesSlug: string
  seriesTitle: string
  chapterNumber: string
  chapterTitle: string
  href: string
}

function localEntries(locale: Locale): HistoryEntry[] {
  const entries: HistoryEntry[] = []
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index)
    if (!key?.startsWith(PROGRESS_KEY_PREFIX)) continue
    const progress = parseProgress(localStorage.getItem(key))
    const [, , seriesSlug, chapterNumber] = key.split(":")
    const series = seriesSlug ? getSeries(seriesSlug) : undefined
    const chapter =
      series && chapterNumber ? getChapter(series, chapterNumber) : undefined
    if (!progress || !series || !chapter || !chapterNumber) continue
    entries.push({
      ...progress,
      seriesSlug: series.slug,
      seriesTitle: series.localizations[locale].title,
      chapterNumber,
      chapterTitle: chapter.localizations[locale].title,
      href: paths.reader(
        locale,
        series.slug,
        chapterNumber,
        progress.releaseId,
      ),
      storageKey: key,
    })
  }
  return entries
}

export function ReadingHistory({ locale }: { locale: Locale }) {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [importedCount, setImportedCount] = useState(0)

  useEffect(() => {
    const locals = localEntries(locale)
    async function load() {
      try {
        const response = await fetch("/api/reading-progress")
        if (!response.ok) throw new Error("history")
        const payload = (await response.json()) as {
          authenticated: boolean
          entries: Array<{
            seriesSlug: string
            seriesTitles: Partial<Record<Locale, string>>
            chapterNumber: string
            chapterTitles: Partial<Record<Locale, string>>
            profileSlug: string
            targetLanguage: Locale
            pageNumber: number
            scrollRatio: number
            updatedAt: string
            completedAt?: string
          }>
        }
        if (payload.authenticated) {
          const importEntries = locals.flatMap((entry) => {
            const series = getSeries(entry.seriesSlug)
            const chapter = series
              ? getChapter(series, entry.chapterNumber)
              : undefined
            const release = chapter?.releases.find(
              (candidate) => candidate.id === entry.releaseId,
            )
            if (!series || !chapter || !release || !entry.storageKey) return []
            return [
              {
                key: entry.storageKey,
                seriesSlug: series.slug,
                chapterNumber: chapter.number,
                profileSlug:
                  getProfile(release.profileId)?.slug ?? release.profileId,
                targetLanguage: release.targetLanguage,
                pageNumber: entry.pageNumber,
                scrollRatio: entry.scrollRatio,
                updatedAt: entry.updatedAt,
                ...(entry.completedAt
                  ? { completedAt: entry.completedAt }
                  : {}),
              },
            ]
          })
          if (importEntries.length) {
            const imported = await fetch("/api/reading-progress/import", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ entries: importEntries }),
            })
            if (imported.ok) {
              const result = (await imported.json()) as {
                importedKeys: string[]
              }
              for (const key of result.importedKeys)
                localStorage.removeItem(key)
              if (result.importedKeys.length) {
                setImportedCount(result.importedKeys.length)
              }
            }
          }
        }
        const remote = payload.entries.flatMap((entry): HistoryEntry[] => {
          const fixtureSeries = getSeries(entry.seriesSlug)
          const fixtureChapter = fixtureSeries
            ? getChapter(fixtureSeries, entry.chapterNumber)
            : undefined
          const fixtureRelease = fixtureChapter?.releases.find(
            (release) =>
              release.targetLanguage === locale &&
              getProfile(release.profileId)?.slug === entry.profileSlug,
          )
          if (!fixtureSeries || !fixtureChapter || !fixtureRelease) return []
          return [
            {
              releaseId: fixtureRelease.id,
              chapterId: fixtureChapter.id,
              pageNumber: entry.pageNumber,
              scrollRatio: entry.scrollRatio,
              updatedAt: entry.updatedAt,
              completedAt: entry.completedAt,
              seriesSlug: entry.seriesSlug,
              seriesTitle:
                entry.seriesTitles[locale] ??
                fixtureSeries.localizations[locale].title,
              chapterNumber: entry.chapterNumber,
              chapterTitle:
                entry.chapterTitles[locale] ??
                fixtureChapter.localizations[locale].title,
              href: paths.reader(
                locale,
                entry.seriesSlug,
                entry.chapterNumber,
                fixtureRelease.id,
              ),
            },
          ]
        })
        const merged = new Map<string, HistoryEntry>()
        for (const entry of [...locals, ...remote]) {
          const key = `${entry.seriesSlug}:${entry.chapterNumber}`
          const current = merged.get(key)
          if (!current || entry.updatedAt > current.updatedAt)
            merged.set(key, entry)
        }
        setEntries(
          [...merged.values()].sort((left, right) =>
            right.updatedAt.localeCompare(left.updatedAt),
          ),
        )
      } catch {
        setEntries(
          locals.sort((left, right) =>
            right.updatedAt.localeCompare(left.updatedAt),
          ),
        )
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [locale])

  if (loading) {
    return (
      <output aria-label="Okuma geçmişi yükleniyor" className="grid gap-3">
        {[1, 2, 3].map((item) => (
          <div
            className="h-24 animate-pulse border border-nv-border bg-surface-raised"
            key={item}
          />
        ))}
      </output>
    )
  }
  if (!entries.length) {
    return (
      <div className="border border-nv-border border-dashed bg-surface p-10 text-center">
        <h2 className="font-bold text-xl">
          {locale === "tr"
            ? "Henüz bir bölüm okumadın"
            : "No reading history yet"}
        </h2>
        <p className="mt-2 text-nv-muted-foreground">
          {locale === "tr"
            ? "Okumaya başladığında kaldığın yer burada görünecek."
            : "Your place will appear here after you start reading."}
        </p>
        <Link
          className="mt-5 inline-flex min-h-11 items-center bg-nv-primary px-5 font-semibold text-nv-primary-foreground"
          href={paths.discover(locale)}
        >
          {locale === "tr" ? "Serileri keşfet" : "Discover series"}
        </Link>
      </div>
    )
  }
  return (
    <>
      {importedCount ? (
        <p
          aria-live="polite"
          className="mb-4 border border-nv-border bg-surface-raised p-3 text-sm"
        >
          {locale === "tr"
            ? `${importedCount} misafir okuma kaydı hesabınıza güvenle aktarıldı.`
            : `${importedCount} guest reading entries were safely imported into your account.`}
        </p>
      ) : null}
      <ol className="grid gap-3">
        {entries.map((entry) => (
          <li
            className="flex flex-wrap items-center justify-between gap-4 border border-nv-border bg-surface p-4"
            key={`${entry.seriesSlug}:${entry.chapterNumber}`}
          >
            <div className="min-w-0 flex-1">
              <h2 className="font-bold">{entry.seriesTitle}</h2>
              <p className="text-sm">
                {locale === "tr" ? "Bölüm" : "Chapter"} {entry.chapterNumber} ·{" "}
                {entry.chapterTitle}
              </p>
              <p className="mt-1 text-nv-muted-foreground text-sm">
                {new Intl.DateTimeFormat(locale, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(entry.updatedAt))}{" "}
                ·{" "}
                {entry.completedAt || entry.scrollRatio >= 0.96
                  ? locale === "tr"
                    ? "Okundu"
                    : "Completed"
                  : locale === "tr"
                    ? `%${Math.round(entry.scrollRatio * 100)} okundu · %${Math.max(0, 100 - Math.round(entry.scrollRatio * 100))} kaldı`
                    : `${Math.round(entry.scrollRatio * 100)}% read · ${Math.max(0, 100 - Math.round(entry.scrollRatio * 100))}% left`}
              </p>
              <div
                aria-label={`${Math.round(entry.scrollRatio * 100)}%`}
                className="mt-3 h-2 overflow-hidden rounded-full bg-surface-raised"
                role="progressbar"
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={Math.round(entry.scrollRatio * 100)}
              >
                <div
                  className="h-full rounded-full bg-nv-primary"
                  style={{ width: `${Math.round(entry.scrollRatio * 100)}%` }}
                />
              </div>
            </div>
            <Link
              className="inline-flex min-h-11 items-center bg-nv-primary px-4 font-semibold text-nv-primary-foreground"
              href={entry.href}
            >
              {locale === "tr" ? "Devam et" : "Continue"}
            </Link>
          </li>
        ))}
      </ol>
    </>
  )
}
