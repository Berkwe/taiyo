"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import type { Locale } from "~/features/platform/domain"
import { paths } from "~/features/platform/paths"

interface FollowEntry {
  seriesSlug: string
  titles: Partial<Record<Locale, string>>
  hasUnread: boolean
  latest: {
    chapterNumber: string
    releaseId: string
    targetLanguage: Locale
  } | null
}

export function FollowedSeries({ locale }: { locale: Locale }) {
  const [entries, setEntries] = useState<FollowEntry[]>([])
  const [authenticated, setAuthenticated] = useState(false)
  useEffect(() => {
    void fetch("/api/follows")
      .then(
        async (response) =>
          (await response.json()) as {
            authenticated: boolean
            entries?: FollowEntry[]
          },
      )
      .then((result) => {
        setAuthenticated(result.authenticated)
        setEntries(result.entries ?? [])
      })
  }, [])
  if (!authenticated || !entries.length) return null
  return (
    <section className="mt-12">
      <h2 className="font-bold text-3xl">
        {locale === "tr" ? "Takip ettiklerim" : "Following"}
      </h2>
      <div className="mt-5 grid gap-3">
        {entries.map((entry) => (
          <article
            className="flex flex-wrap items-center justify-between gap-4 border border-nv-border bg-surface p-4"
            key={entry.seriesSlug}
          >
            <div>
              <h3 className="font-bold">
                {entry.titles[locale] ?? entry.seriesSlug}
              </h3>
              <p className="text-nv-muted-foreground text-sm">
                {entry.latest
                  ? `${locale === "tr" ? "Son bölüm" : "Latest chapter"}: ${entry.latest.chapterNumber}`
                  : locale === "tr"
                    ? "Henüz bölüm yok"
                    : "No chapters yet"}
                {entry.hasUnread
                  ? ` · ${locale === "tr" ? "Yeni" : "New"}`
                  : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                className="inline-flex min-h-11 items-center border border-nv-border px-4 font-semibold"
                href={paths.series(locale, entry.seriesSlug)}
              >
                {locale === "tr" ? "Seriye git" : "Open series"}
              </Link>
              {entry.latest ? (
                <Link
                  className="inline-flex min-h-11 items-center bg-nv-primary px-4 font-semibold text-nv-primary-foreground"
                  href={paths.reader(
                    locale,
                    entry.seriesSlug,
                    entry.latest.chapterNumber,
                    entry.latest.releaseId,
                  )}
                >
                  {locale === "tr" ? "Yeni bölüme git" : "Open latest"}
                </Link>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
