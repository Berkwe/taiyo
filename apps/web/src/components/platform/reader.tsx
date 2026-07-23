"use client"

import { AlertCircle, ArrowLeft, ArrowRight, RotateCcw } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import type {
  Chapter,
  ChapterRelease,
  Locale,
  Series,
} from "~/features/platform/domain"
import { getProfile } from "~/features/platform/fixtures"
import { paths } from "~/features/platform/paths"
import { PROGRESS_KEY_PREFIX } from "./continue-reading-card"

function ReaderImage({
  alt,
  height,
  index,
  onVisible,
  src,
  width,
}: {
  alt: string
  height: number
  index: number
  onVisible: (index: number) => void
  src: string
  width: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [retry, setRetry] = useState(0)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) onVisible(index)
      },
      { rootMargin: "-35% 0px -35% 0px", threshold: 0.01 },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [index, onVisible])

  return (
    <div
      className="relative mx-auto w-full max-w-[1200px] bg-reader-background"
      id={`reader-page-${index + 1}`}
      ref={ref}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      {failed ? (
        <div className="absolute inset-0 grid place-content-center gap-4 p-6 text-center text-reader-foreground">
          <AlertCircle className="mx-auto" />
          <p>Görsel yüklenemedi.</p>
          <button
            className="mx-auto inline-flex min-h-11 items-center gap-2 border border-nv-border px-4"
            onClick={() => {
              setFailed(false)
              setRetry((value) => value + 1)
            }}
            type="button"
          >
            <RotateCcw size={17} /> Tekrar dene
          </button>
        </div>
      ) : (
        <Image
          alt={alt}
          className="object-contain"
          fill
          key={retry}
          loading={index === 0 ? "eager" : "lazy"}
          onError={() => setFailed(true)}
          priority={index === 0}
          sizes="(max-width: 1200px) 100vw, 1200px"
          src={src}
        />
      )}
    </div>
  )
}

export function Reader({
  chapter,
  locale,
  nextHref,
  previousHref,
  release,
  series,
}: {
  chapter: Chapter
  locale: Locale
  nextHref?: string
  previousHref?: string
  release: ChapterRelease
  series: Series
}) {
  const [pageNumber, setPageNumber] = useState(1)
  const [background, setBackground] = useState<"ink" | "soft" | "light">("ink")
  const progressKey = `${PROGRESS_KEY_PREFIX}${series.slug}:${chapter.number}`
  const profile = getProfile(release.profileId)
  const sameLanguageReleases = chapter.releases.filter(
    (item) => item.targetLanguage === release.targetLanguage,
  )
  const backgroundClass = {
    ink: "bg-reader-background",
    soft: "bg-surface-raised",
    light: "bg-background",
  }[background]

  useEffect(() => {
    const saved = localStorage.getItem(progressKey)
    if (!saved) return
    try {
      const parsed = JSON.parse(saved) as {
        releaseId?: string
        scrollRatio?: number
      }
      if (
        parsed.releaseId !== release.id ||
        typeof parsed.scrollRatio !== "number"
      )
        return
      const scrollRatio = parsed.scrollRatio
      requestAnimationFrame(() => {
        const maxScroll =
          document.documentElement.scrollHeight - window.innerHeight
        window.scrollTo({ top: Math.max(0, maxScroll * scrollRatio) })
      })
    } catch {
      // Corrupt local progress is intentionally ignored.
    }
  }, [progressKey, release.id])

  useEffect(() => {
    let frame = 0
    const save = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const maxScroll =
          document.documentElement.scrollHeight - window.innerHeight
        const scrollRatio =
          maxScroll > 0 ? Math.min(1, window.scrollY / maxScroll) : 0
        localStorage.setItem(
          progressKey,
          JSON.stringify({
            releaseId: release.id,
            chapterId: chapter.id,
            pageNumber,
            scrollRatio,
            updatedAt: new Date().toISOString(),
            ...(scrollRatio > 0.97
              ? { completedAt: new Date().toISOString() }
              : {}),
          }),
        )
      })
    }
    window.addEventListener("scroll", save, { passive: true })
    save()
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", save)
    }
  }, [chapter.id, pageNumber, progressKey, release.id])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" && previousHref)
        window.location.assign(previousHref)
      if (event.key === "ArrowRight" && nextHref)
        window.location.assign(nextHref)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [nextHref, previousHref])

  const onVisible = useMemo(
    () => (index: number) => setPageNumber(index + 1),
    [],
  )

  return (
    <main
      className={`safe-reader min-h-screen ${backgroundClass}`}
      id="main-content"
    >
      <div className="sticky top-16 z-40 border-nv-border border-b bg-surface/95 text-foreground backdrop-blur">
        <div className="grid gap-3 py-3 content-shell lg:grid-cols-[1fr_auto_auto] lg:items-center">
          <div className="min-w-0">
            <Link
              className="text-nv-muted-foreground text-xs hover:text-foreground"
              href={paths.chapter(locale, series.slug, chapter.number)}
            >
              ←{" "}
              {locale === "tr"
                ? "Bölüm bilgisine dön"
                : "Back to chapter details"}
            </Link>
            <p className="truncate font-semibold">
              {series.localizations[locale].title} ·{" "}
              {locale === "tr" ? "Bölüm" : "Chapter"} {chapter.number}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="reader-edition">
              Çeviri sürümü
            </label>
            <select
              className="min-h-11 max-w-52 border border-input bg-background px-3 text-sm"
              id="reader-edition"
              onChange={(event) => window.location.assign(event.target.value)}
              value={paths.reader(
                locale,
                series.slug,
                chapter.number,
                release.id,
              )}
            >
              {sameLanguageReleases.map((item) => (
                <option
                  value={paths.reader(
                    locale,
                    series.slug,
                    chapter.number,
                    item.id,
                  )}
                  key={item.id}
                >
                  {getProfile(item.profileId)?.labels[locale]}
                </option>
              ))}
            </select>
            <span aria-live="polite" className="min-w-16 text-right text-sm">
              {pageNumber}/{release.pages.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {(["ink", "soft", "light"] as const).map((option) => (
              <button
                aria-label={`Okuyucu arka planı: ${option}`}
                aria-pressed={background === option}
                className="min-h-11 border border-nv-border px-3 text-xs aria-pressed:bg-nv-primary aria-pressed:text-nv-primary-foreground"
                onClick={() => setBackground(option)}
                type="button"
                key={option}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        <div
          aria-label={`Okuma ilerlemesi: ${pageNumber}/${release.pages.length}`}
          className="h-1 bg-nv-primary transition-[width]"
          role="progressbar"
          aria-valuemax={release.pages.length}
          aria-valuemin={1}
          aria-valuenow={pageNumber}
          style={{ width: `${(pageNumber / release.pages.length) * 100}%` }}
        />
      </div>

      <div className="mx-auto py-5">
        <div className="mb-4 text-center text-reader-foreground">
          <span className="border border-nv-border bg-overlay px-3 py-2 text-sm">
            {profile?.labels[locale]} · {release.overallQualityScore}/100
          </span>
        </div>
        {release.pages.map((page, index) => (
          <ReaderImage
            alt={page.alt}
            height={page.height}
            index={index}
            onVisible={onVisible}
            src={page.src}
            width={page.width}
            key={page.pageNumber}
          />
        ))}
      </div>

      <nav
        aria-label={locale === "tr" ? "Bölüm geçişi" : "Chapter navigation"}
        className="grid gap-3 py-10 content-shell sm:grid-cols-2"
      >
        {previousHref ? (
          <Link
            className="inline-flex min-h-12 items-center justify-center gap-2 border border-nv-border bg-surface px-5 text-foreground"
            href={previousHref}
          >
            <ArrowLeft size={18} />{" "}
            {locale === "tr" ? "Önceki bölüm" : "Previous chapter"}
          </Link>
        ) : (
          <span />
        )}
        {nextHref ? (
          <Link
            className="inline-flex min-h-12 items-center justify-center gap-2 bg-nv-primary px-5 font-semibold text-nv-primary-foreground"
            href={nextHref}
          >
            {locale === "tr" ? "Sonraki bölüm" : "Next chapter"}{" "}
            <ArrowRight size={18} />
          </Link>
        ) : null}
      </nav>
    </main>
  )
}
