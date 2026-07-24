"use client"

import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronDown,
  Pause,
  Play,
  Settings,
  TriangleAlert,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import type {
  Chapter,
  ChapterRelease,
  Locale,
  Series,
} from "~/features/platform/domain"
import { getProfile } from "~/features/platform/fixtures"
import { paths } from "~/features/platform/paths"
import { PROGRESS_KEY_PREFIX } from "./continue-reading-card"
import { ReaderImage } from "./reader-image"
import { ReaderReportDialog } from "./reader-report-dialog"
import { ReaderSelection, type ReaderSelectionResult } from "./reader-selection"

const autoScrollKey = "novora:reader:auto-scroll"
const speedPixelsPerSecond = { slow: 24, normal: 48, fast: 82 } as const

function blocksManualChapterPull(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        "[data-reader-controls],[role=dialog],a,button,input,select,textarea,[contenteditable=true]",
      ),
    )
  )
}

function blocksWheelChapterPull(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        "[role=dialog],input,select,textarea,[contenteditable=true]",
      ),
    )
  )
}

export function Reader({
  authenticated,
  chapter,
  chapterOptions,
  locale,
  nextHref,
  previousHref,
  release,
  series,
}: {
  authenticated: boolean
  chapter: Chapter
  chapterOptions: Array<{ href: string; number: string }>
  locale: Locale
  nextHref?: string
  previousHref?: string
  release: ChapterRelease
  series: Series
}) {
  const [pageNumber, setPageNumber] = useState(1)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [background, setBackground] = useState<"ink" | "soft" | "light">("ink")
  const [autoScroll, setAutoScroll] = useState(false)
  const [speed, setSpeed] = useState<"slow" | "normal" | "fast">("normal")
  const [scrollDistance, setScrollDistance] = useState(50)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [scrollRatio, setScrollRatio] = useState(0)
  const [endPull, setEndPull] = useState(0)
  const [reportOpen, setReportOpen] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [selection, setSelection] = useState<ReaderSelectionResult | null>(null)
  const progressKey = `${PROGRESS_KEY_PREFIX}${series.slug}:${chapter.number}`
  const profile = getProfile(release.profileId)
  const profileSlug = profile?.slug ?? release.profileId
  const autoFrame = useRef(0)
  const nextChapterTrigger = useRef<HTMLElement>(null)
  const changingChapter = useRef(false)
  const endPullArmed = useRef(false)
  const manualEndPullUntil = useRef(0)
  const touchStartY = useRef<number | null>(null)
  const progressDragPointer = useRef<number | null>(null)
  const tapStart = useRef<{ x: number; y: number; time: number } | null>(null)
  const backgroundClass = {
    ink: "bg-reader-background",
    soft: "bg-surface-raised",
    light: "bg-background",
  }[background]

  const disarmChapterPull = useCallback(() => {
    endPullArmed.current = false
    manualEndPullUntil.current = 0
  }, [])

  const seekToRatio = useCallback(
    (ratio: number) => {
      const nextRatio = Math.min(1, Math.max(0, ratio))
      disarmChapterPull()
      setAutoScroll(false)
      setScrollRatio(nextRatio)
      const maxScroll =
        document.documentElement.scrollHeight - window.innerHeight
      window.scrollTo({
        top: Math.max(0, maxScroll * nextRatio),
        behavior: "instant",
      })
    },
    [disarmChapterPull],
  )

  const seekFromPointer = useCallback(
    (input: HTMLInputElement, clientY: number) => {
      const rect = input.getBoundingClientRect()
      if (rect.height <= 0) return
      seekToRatio((clientY - rect.top) / rect.height)
    },
    [seekToRatio],
  )

  useEffect(() => {
    try {
      const setting = JSON.parse(
        localStorage.getItem(autoScrollKey) ?? "{}",
      ) as {
        speed?: "slow" | "normal" | "fast"
      }
      if (setting.speed && setting.speed in speedPixelsPerSecond)
        setSpeed(setting.speed)
    } catch {
      // Invalid preferences fall back to normal.
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(
      autoScrollKey,
      JSON.stringify({ speed, distance: scrollDistance }),
    )
  }, [scrollDistance, speed])

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
      requestAnimationFrame(() => {
        disarmChapterPull()
        const maxScroll =
          document.documentElement.scrollHeight - window.innerHeight
        const restoredPosition = Math.max(0, maxScroll * parsed.scrollRatio!)
        const safeChapterEnd = nextChapterTrigger.current
          ? Math.max(
              0,
              nextChapterTrigger.current.offsetTop - window.innerHeight,
            )
          : restoredPosition
        window.scrollTo({
          top: Math.min(restoredPosition, safeChapterEnd),
        })
      })
    } catch {
      // Corrupt local progress is intentionally ignored.
    }
  }, [disarmChapterPull, progressKey, release.id])

  useEffect(() => {
    let localFrame = 0
    let serverTimer = 0
    const save = () => {
      cancelAnimationFrame(localFrame)
      localFrame = requestAnimationFrame(() => {
        const maxScroll =
          document.documentElement.scrollHeight - window.innerHeight
        const scrollRatio =
          maxScroll > 0 ? Math.min(1, window.scrollY / maxScroll) : 0
        setScrollRatio(scrollRatio)
        const progress = {
          releaseId: release.id,
          chapterId: chapter.id,
          pageNumber,
          scrollRatio,
          updatedAt: new Date().toISOString(),
          ...(scrollRatio > 0.96
            ? { completedAt: new Date().toISOString() }
            : {}),
        }
        localStorage.setItem(progressKey, JSON.stringify(progress))
        if (!authenticated) return
        window.clearTimeout(serverTimer)
        serverTimer = window.setTimeout(() => {
          void fetch("/api/reading-progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            keepalive: true,
            body: JSON.stringify({
              seriesSlug: series.slug,
              chapterNumber: chapter.number,
              profileSlug,
              targetLanguage: release.targetLanguage,
              pageNumber,
              scrollRatio,
              completed: scrollRatio > 0.96,
            }),
          })
        }, 1_500)
      })
    }
    window.addEventListener("scroll", save, { passive: true })
    save()
    return () => {
      cancelAnimationFrame(localFrame)
      window.clearTimeout(serverTimer)
      window.removeEventListener("scroll", save)
    }
  }, [
    authenticated,
    chapter.id,
    chapter.number,
    pageNumber,
    profileSlug,
    progressKey,
    release.id,
    release.targetLanguage,
    series.slug,
  ])

  useEffect(() => {
    if (!autoScroll) {
      cancelAnimationFrame(autoFrame.current)
      return
    }
    disarmChapterPull()
    let previous = performance.now()
    const tick = (now: number) => {
      const delta = Math.min(50, now - previous)
      previous = now
      window.scrollBy({
        top:
          (speedPixelsPerSecond[speed] * (scrollDistance / 50) * delta) / 1_000,
        behavior: "instant",
      })
      if (
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 2
      ) {
        setAutoScroll(false)
        return
      }
      autoFrame.current = requestAnimationFrame(tick)
    }
    autoFrame.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(autoFrame.current)
  }, [autoScroll, disarmChapterPull, scrollDistance, speed])

  useEffect(() => {
    const pauseManual = (event: Event) => {
      if (
        event.target instanceof Element &&
        event.target.closest("[data-reader-controls]")
      )
        return
      setAutoScroll(false)
    }
    window.addEventListener("wheel", pauseManual, { passive: true })
    window.addEventListener("touchstart", pauseManual, { passive: true })
    return () => {
      window.removeEventListener("wheel", pauseManual)
      window.removeEventListener("touchstart", pauseManual)
    }
  }, [])

  useEffect(() => {
    if (!nextHref) return
    const disarm = () => {
      endPullArmed.current = false
      manualEndPullUntil.current = 0
    }
    const arm = (duration: number) => {
      endPullArmed.current = true
      manualEndPullUntil.current = performance.now() + duration
      requestAnimationFrame(update)
    }
    const armWithWheel = (event: WheelEvent) => {
      if (blocksWheelChapterPull(event.target)) {
        disarm()
        return
      }
      if (event.deltaY > 0) arm(500)
    }
    const rememberTouch = (event: TouchEvent) => {
      if (blocksManualChapterPull(event.target)) {
        touchStartY.current = null
        disarm()
        return
      }
      touchStartY.current = event.touches[0]?.clientY ?? null
    }
    const armWithTouch = (event: TouchEvent) => {
      if (blocksManualChapterPull(event.target)) {
        touchStartY.current = null
        disarm()
        return
      }
      const currentY = event.touches[0]?.clientY
      if (
        currentY !== undefined &&
        touchStartY.current !== null &&
        touchStartY.current - currentY > 12
      )
        arm(1_100)
    }
    const armWithKeyboard = (event: KeyboardEvent) => {
      if (event.defaultPrevented || blocksManualChapterPull(event.target)) {
        disarm()
        return
      }
      if (["ArrowDown", "PageDown", "End"].includes(event.key)) arm(800)
    }
    const update = () => {
      const trigger = nextChapterTrigger.current
      if (!trigger) return
      const rect = trigger.getBoundingClientRect()
      const progress = Math.min(
        1,
        Math.max(0, (window.innerHeight - rect.top) / rect.height),
      )
      setEndPull(Math.round(progress * 100))
      if (progress < 0.05 || manualEndPullUntil.current < performance.now())
        disarm()
      if (
        progress >= 0.86 &&
        endPullArmed.current &&
        manualEndPullUntil.current >= performance.now() &&
        !changingChapter.current
      ) {
        changingChapter.current = true
        disarm()
        window.location.assign(nextHref)
      }
    }
    const finishTouch = () => {
      touchStartY.current = null
    }
    window.addEventListener("wheel", armWithWheel, { passive: true })
    window.addEventListener("touchstart", rememberTouch, { passive: true })
    window.addEventListener("touchmove", armWithTouch, { passive: true })
    window.addEventListener("touchend", finishTouch, { passive: true })
    window.addEventListener("touchcancel", finishTouch, { passive: true })
    window.addEventListener("keydown", armWithKeyboard)
    window.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)
    update()
    return () => {
      window.removeEventListener("wheel", armWithWheel)
      window.removeEventListener("touchstart", rememberTouch)
      window.removeEventListener("touchmove", armWithTouch)
      window.removeEventListener("touchend", finishTouch)
      window.removeEventListener("touchcancel", finishTouch)
      window.removeEventListener("keydown", armWithKeyboard)
      window.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
    }
  }, [nextHref])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setReportOpen(false)
        setSelecting(false)
      }
      if (blocksManualChapterPull(event.target)) return
      if (event.key === "ArrowLeft" && previousHref)
        window.location.assign(previousHref)
      if (event.key === "ArrowRight" && nextHref)
        window.location.assign(nextHref)
      if (event.key === " ") {
        event.preventDefault()
        setControlsVisible((value) => !value)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [nextHref, previousHref])

  const onVisible = useCallback((index: number) => setPageNumber(index + 1), [])
  const topClass =
    controlsVisible && !selecting ? "translate-y-0" : "-translate-y-full"
  const bottomClass =
    controlsVisible && !selecting ? "translate-y-0" : "translate-y-full"

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the reader has a document-level Space keyboard shortcut for the same action
    <main
      className={`reader-shell safe-reader relative min-h-screen select-none ${backgroundClass}`}
      id="main-content"
      onClick={(event) => {
        if (
          selecting ||
          (event.target as HTMLElement).closest(
            "a,button,input,select,textarea,[role=dialog]",
          )
        )
          return
        const start = tapStart.current
        tapStart.current = null
        if (
          !start ||
          Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10 ||
          performance.now() - start.time > 600
        )
          return
        setControlsVisible((value) => !value)
      }}
      onPointerDown={(event) => {
        tapStart.current = {
          x: event.clientX,
          y: event.clientY,
          time: performance.now(),
        }
      }}
    >
      <header
        className={`sticky top-0 z-[60] border-nv-border border-b bg-surface/95 text-foreground backdrop-blur transition-transform duration-150 ${topClass}`}
        data-reader-controls
      >
        <div className="grid min-h-16 grid-cols-[auto_1fr_auto] items-center gap-2 px-2 sm:px-4">
          <div className="flex items-center">
            <Link
              aria-label={locale === "tr" ? "Seriye dön" : "Back to series"}
              className="inline-flex size-11 items-center justify-center"
              href={paths.series(locale, series.slug)}
            >
              <ArrowLeft aria-hidden="true" size={20} />
            </Link>
            <Link
              className="max-w-[45vw] truncate rounded px-1 font-semibold text-sm hover:text-nv-primary"
              href={paths.chapter(locale, series.slug, chapter.number)}
            >
              {series.localizations[locale].title} /{" "}
              {locale === "tr" ? "Bölüm" : "Chapter"} {chapter.number}
            </Link>
          </div>
          <span />
          <div className="flex items-center justify-end">
            <button
              aria-label={locale === "tr" ? "İçeriği bildir" : "Report content"}
              className="inline-flex size-11 items-center justify-center"
              onClick={() => setReportOpen(true)}
              type="button"
            >
              <TriangleAlert aria-hidden="true" size={21} />
            </button>
            <button
              aria-label="Otomatik kaydırmayı başlat veya duraklat"
              className="inline-flex size-11 items-center justify-center"
              onClick={() => {
                setAutoScroll((value) => !value)
              }}
              type="button"
            >
              {autoScroll ? <Pause size={21} /> : <Play size={21} />}
            </button>
            <button
              aria-expanded={settingsOpen}
              aria-label={
                locale === "tr" ? "Okuyucu ayarları" : "Reader settings"
              }
              className="inline-flex size-11 items-center justify-center"
              onClick={() => setSettingsOpen((value) => !value)}
              type="button"
            >
              <Settings size={21} />
            </button>
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
        {settingsOpen ? (
          <aside className="ml-auto w-full max-w-sm border-nv-border border-t bg-surface p-4 shadow-xl">
            <label className="grid gap-2 text-sm">
              <span className="font-semibold">Kaydırma hızı</span>
              <select
                className="min-h-11 border border-nv-border bg-background px-3"
                onChange={(event) =>
                  setSpeed(event.target.value as "slow" | "normal" | "fast")
                }
                value={speed}
              >
                <option value="slow">Yavaş</option>
                <option value="normal">Normal</option>
                <option value="fast">Hızlı</option>
              </select>
            </label>
            <label className="mt-4 grid gap-2 text-sm">
              <span className="font-semibold">
                Kaydırma mesafesi · %{scrollDistance}
              </span>
              <input
                max="100"
                min="25"
                onChange={(event) =>
                  setScrollDistance(Number(event.target.value))
                }
                type="range"
                value={scrollDistance}
              />
            </label>
            <fieldset className="mt-4">
              <legend className="mb-2 font-semibold text-sm">
                Okuyucu arka planı
              </legend>
              <div className="grid grid-cols-3 gap-2">
                {(["ink", "soft", "light"] as const).map((option) => (
                  <button
                    aria-pressed={background === option}
                    className="min-h-10 rounded border border-nv-border text-xs aria-pressed:bg-nv-primary aria-pressed:text-nv-primary-foreground"
                    onClick={() => setBackground(option)}
                    type="button"
                    key={option}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="mt-5 border-nv-border border-t pt-4 text-nv-muted-foreground text-xs leading-6">
              <strong className="text-foreground">Kısayollar</strong>
              <p>
                Boşluk: araç çubuğu · ←/→: bölüm değiştir · Esc: pencereyi kapat
              </p>
            </div>
          </aside>
        ) : null}
      </header>

      <div className="mx-auto py-4">
        <section className="mx-auto mb-8 grid max-w-3xl place-items-center gap-4 px-5 pt-6 text-center text-reader-foreground">
          <Image
            alt={`${series.localizations[locale].title} kapağı`}
            className="aspect-[2/3] w-32 rounded-lg border border-nv-border object-cover shadow-xl sm:w-40"
            height={240}
            priority
            src={series.cover}
            width={160}
          />
          <div>
            <p className="text-nv-muted-foreground text-sm">
              {profile?.labels[locale]} · {release.overallQualityScore}/100
            </p>
            <h1 className="mt-2 font-bold text-2xl">
              <Link
                className="hover:text-nv-primary"
                href={paths.chapter(locale, series.slug, chapter.number)}
              >
                {series.localizations[locale].title}
              </Link>
            </h1>
            <p className="mt-1">
              {locale === "tr" ? "Bölüm" : "Chapter"} {chapter.number} ·{" "}
              {chapter.localizations[locale].title}
            </p>
          </div>
          <nav className="flex items-center gap-3">
            {previousHref ? (
              <Link
                className="rounded-full border border-nv-border px-4 py-2"
                href={previousHref}
              >
                ← {locale === "tr" ? "Önceki" : "Previous"}
              </Link>
            ) : null}
            {nextHref ? (
              <Link
                className="rounded-full border border-nv-border px-4 py-2"
                href={nextHref}
              >
                {locale === "tr" ? "Sonraki" : "Next"} →
              </Link>
            ) : null}
          </nav>
          <ChevronDown className="mt-2 animate-bounce text-nv-primary" />
        </section>
        {release.pages.map((page, index) => (
          <ReaderImage
            index={index}
            onVisible={onVisible}
            page={page}
            key={page.pageNumber}
          />
        ))}
        <nav className="mx-auto flex max-w-3xl items-center justify-between gap-3 border-nv-border border-t px-5 py-8 text-reader-foreground">
          {previousHref ? (
            <Link
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-nv-border px-4 font-semibold"
              href={previousHref}
            >
              <ArrowLeft size={18} />
              {locale === "tr" ? "Önceki bölüm" : "Previous chapter"}
            </Link>
          ) : (
            <span />
          )}
          {nextHref ? (
            <Link
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-nv-border px-4 font-semibold"
              href={nextHref}
            >
              {locale === "tr" ? "Sonraki bölüm" : "Next chapter"}
              <ArrowRight size={18} />
            </Link>
          ) : null}
        </nav>
        <section
          className={`relative mx-auto max-w-3xl px-5 text-center text-reader-foreground ${
            nextHref ? "min-h-[95vh]" : "grid min-h-64 place-content-center"
          }`}
          ref={nextChapterTrigger}
        >
          <div
            className="sticky top-[42vh] grid place-content-center gap-3 transition-all duration-500"
            style={{
              opacity: endPull < 12 ? 0 : Math.max(0.25, endPull / 100),
              transform: `translateY(${Math.max(0, 28 - endPull / 3)}px) scale(${0.94 + endPull / 1700})`,
            }}
          >
            {nextHref ? (
              <>
                <span className="mx-auto grid size-14 place-items-center rounded-full border border-nv-primary bg-nv-primary-soft">
                  <ArrowRight className="animate-pulse text-nv-primary" />
                </span>
                <strong className="text-xl sm:text-2xl">
                  {locale === "tr" ? "Sonraki bölüm" : "Next chapter"}
                </strong>
                <span className="text-nv-muted-foreground text-sm">
                  {endPull > 70
                    ? locale === "tr"
                      ? "Çok az kaldı, biraz daha kaydır"
                      : "Almost there, keep scrolling"
                    : locale === "tr"
                      ? "Geçmek için biraz daha kaydır"
                      : "Scroll a little further to continue"}
                </span>
                <span className="mx-auto h-1.5 w-44 overflow-hidden rounded-full bg-surface-raised">
                  <span
                    className="block h-full bg-nv-primary transition-[width] duration-150"
                    style={{ width: `${endPull}%` }}
                  />
                </span>
              </>
            ) : (
              <>
                <p className="text-nv-muted-foreground">
                  {locale === "tr" ? "Bölüm sonu" : "End of chapter"}
                </p>
                <strong>
                  {locale === "tr"
                    ? "Güncel bölüme ulaştın."
                    : "You are up to date."}
                </strong>
              </>
            )}
          </div>
        </section>
      </div>

      {controlsVisible && !selecting ? (
        <label
          className="-translate-y-1/2 fixed top-1/2 left-2 z-[60] flex flex-col items-center gap-2 rounded-full border border-nv-border bg-surface/95 px-2 py-3 text-xs"
          data-reader-controls
        >
          <span>%{Math.round(scrollRatio * 100)}</span>
          <input
            aria-label="Okuma ilerlemesi"
            className="h-44 cursor-ns-resize touch-none accent-nv-primary [writing-mode:vertical-lr]"
            max="1000"
            min="0"
            onChange={(event) => {
              seekToRatio(Number(event.target.value) / 1000)
            }}
            onPointerCancel={() => {
              progressDragPointer.current = null
            }}
            onPointerDown={(event) => {
              event.preventDefault()
              event.currentTarget.focus()
              progressDragPointer.current = event.pointerId
              event.currentTarget.setPointerCapture(event.pointerId)
              seekFromPointer(event.currentTarget, event.clientY)
            }}
            onPointerMove={(event) => {
              if (progressDragPointer.current !== event.pointerId) return
              seekFromPointer(event.currentTarget, event.clientY)
            }}
            onPointerUp={(event) => {
              if (progressDragPointer.current !== event.pointerId) return
              seekFromPointer(event.currentTarget, event.clientY)
              progressDragPointer.current = null
              if (event.currentTarget.hasPointerCapture(event.pointerId))
                event.currentTarget.releasePointerCapture(event.pointerId)
            }}
            type="range"
            value={Math.round(scrollRatio * 1000)}
          />
        </label>
      ) : null}

      <div
        className={`fixed right-0 bottom-0 left-0 z-50 border-nv-border border-t bg-surface/95 pb-[env(safe-area-inset-bottom)] text-foreground backdrop-blur transition-transform duration-150 ${bottomClass}`}
        data-reader-controls
      >
        <div className="grid min-h-16 grid-cols-[1fr_auto_1fr] items-center gap-2 px-2 sm:px-4">
          <div className="flex min-w-0 items-center gap-1">
            {previousHref ? (
              <Link
                aria-label="Önceki bölüm"
                className="inline-flex size-11 items-center justify-center"
                href={previousHref}
              >
                <ArrowLeft size={20} />
              </Link>
            ) : (
              <span />
            )}
          </div>
          <nav
            aria-label={locale === "tr" ? "Bölüm geçişi" : "Chapter navigation"}
            className="flex items-center justify-center gap-1"
          >
            <select
              aria-label="Bölüm seç"
              className="min-h-11 max-w-36 rounded-md border border-nv-border bg-background px-3 text-sm"
              onChange={(event) => window.location.assign(event.target.value)}
              value={
                chapterOptions.find((item) => item.number === chapter.number)
                  ?.href
              }
            >
              {chapterOptions.map((item) => (
                <option key={item.number} value={item.href}>
                  {locale === "tr" ? "Bölüm" : "Chapter"} {item.number}
                </option>
              ))}
            </select>
          </nav>
          <div className="flex justify-end gap-1">
            {nextHref ? (
              <Link
                aria-label="Sonraki bölüm"
                className="inline-flex size-11 items-center justify-center"
                href={nextHref}
              >
                <ArrowRight size={20} />
              </Link>
            ) : (
              <span />
            )}
          </div>
        </div>
      </div>

      <button
        aria-label={
          locale === "tr" ? "Bölüm başına dön" : "Back to chapter start"
        }
        className={`fixed right-4 z-[55] inline-flex size-12 items-center justify-center rounded-full border border-nv-border bg-surface/75 text-foreground shadow-lg backdrop-blur transition-[bottom,background-color] duration-200 hover:bg-surface ${
          controlsVisible && !selecting
            ? "bottom-[calc(5rem+env(safe-area-inset-bottom))]"
            : "bottom-[calc(1rem+env(safe-area-inset-bottom))]"
        }`}
        onClick={() => {
          const root = document.documentElement
          const previousBehavior = root.style.scrollBehavior
          root.style.scrollBehavior = "auto"
          window.scrollTo({ top: 0 })
          root.style.scrollBehavior = previousBehavior
        }}
        type="button"
      >
        <ArrowUp aria-hidden="true" size={22} />
      </button>

      {reportOpen ? (
        <ReaderReportDialog
          authenticated={authenticated}
          chapter={chapter}
          onClose={() => setReportOpen(false)}
          onSelectFromReader={() => {
            setReportOpen(false)
            setControlsVisible(false)
            setSelecting(true)
          }}
          release={release}
          selection={selection}
          series={series}
        />
      ) : null}
      {selecting ? (
        <ReaderSelection
          onCancel={() => {
            setSelecting(false)
            setControlsVisible(true)
            setReportOpen(true)
          }}
          onComplete={(result) => {
            if (selection?.previewUrl) URL.revokeObjectURL(selection.previewUrl)
            setSelection(result)
            setSelecting(false)
            setReportOpen(true)
          }}
        />
      ) : null}
    </main>
  )
}
