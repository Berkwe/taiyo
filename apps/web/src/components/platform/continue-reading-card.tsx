"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import type { ReadingProgress } from "~/features/platform/domain"

export const PROGRESS_KEY_PREFIX = "novora:progress:"

export function parseProgress(value: string | null): ReadingProgress | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as Partial<ReadingProgress>
    if (
      typeof parsed.releaseId !== "string" ||
      typeof parsed.chapterId !== "string" ||
      typeof parsed.pageNumber !== "number" ||
      typeof parsed.scrollRatio !== "number" ||
      parsed.scrollRatio < 0 ||
      parsed.scrollRatio > 1 ||
      typeof parsed.updatedAt !== "string"
    ) {
      return null
    }
    return parsed as ReadingProgress
  } catch {
    return null
  }
}

export function ContinueReadingCard({ locale }: { locale: "tr" | "en" }) {
  const [entry, setEntry] = useState<{
    progress: ReadingProgress
    href: string
  }>()

  useEffect(() => {
    let latest:
      | {
          progress: ReadingProgress
          href: string
        }
      | undefined
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (!key?.startsWith(PROGRESS_KEY_PREFIX)) continue
      const progress = parseProgress(localStorage.getItem(key))
      if (!progress) continue
      const [, , slug, chapter] = key.split(":")
      if (!slug || !chapter) continue
      const candidate = {
        progress,
        href: `/${locale}/${locale === "tr" ? "oku" : "read"}/${slug}/${chapter}/${progress.releaseId}`,
      }
      if (!latest || candidate.progress.updatedAt > latest.progress.updatedAt) {
        latest = candidate
      }
    }
    setEntry(latest)
  }, [locale])

  if (!entry) return null

  return (
    <section aria-labelledby="continue-title" className="pt-10 content-shell">
      <div className="border border-nv-border bg-surface p-5">
        <p className="text-nv-muted-foreground text-sm">
          {locale === "tr" ? "Kaldığın yer" : "Pick up where you left off"}
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-xl" id="continue-title">
              {locale === "tr" ? "Okumaya devam et" : "Continue reading"}
            </h2>
            <p className="mt-1 text-nv-muted-foreground text-sm">
              %{Math.round(entry.progress.scrollRatio * 100)} ·{" "}
              {locale === "tr" ? "sayfa" : "page"} {entry.progress.pageNumber}
            </p>
          </div>
          <Link
            className="inline-flex min-h-11 items-center bg-nv-primary px-5 font-semibold text-nv-primary-foreground hover:bg-nv-primary-hover"
            href={entry.href}
          >
            {locale === "tr" ? "Devam et" : "Continue"}
          </Link>
        </div>
      </div>
    </section>
  )
}
