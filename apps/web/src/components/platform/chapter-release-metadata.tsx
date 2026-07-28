"use client"

import { Check, ChevronDown, Globe2 } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import type {
  Chapter,
  ChapterRelease,
  Locale,
} from "~/features/platform/domain"
import { paths } from "~/features/platform/paths"
import {
  activeReleaseForSource,
  anonymousSourceLabel,
  distinctSources,
  qualityLabel,
  selectDefaultRelease,
  sourcePreferenceKey,
  sourcePreferenceToken,
  translationTypeLabel,
} from "~/features/platform/source-editions"
import { SourceInfoPopover } from "./source-info-popover"

function QualityBadge({
  locale,
  release,
}: {
  locale: Locale
  release: ChapterRelease
}) {
  return (
    <span
      className={
        release.qualityTier === "premium"
          ? "quality-badge-premium"
          : "quality-badge-balanced"
      }
    >
      {qualityLabel(release.qualityTier, locale)}
    </span>
  )
}

export function ChapterTranslationTypeBadge({
  locale,
  release,
}: {
  locale: Locale
  release: ChapterRelease
}) {
  const className =
    release.translationType === "ai"
      ? "border-nv-primary bg-nv-primary-soft text-nv-primary"
      : release.translationType === "human"
        ? "border-nv-success bg-surface-raised text-nv-success"
        : "border-nv-border bg-surface-raised text-nv-muted-foreground"
  return (
    <span
      className={`inline-flex min-h-8 shrink-0 items-center rounded-full border px-3 font-semibold text-sm ${className}`}
    >
      {translationTypeLabel(release.translationType, locale)}
    </span>
  )
}

export function ChapterReleaseMetadata({
  chapter,
  locale,
  seriesSlug,
}: {
  chapter: Chapter
  locale: Locale
  seriesSlug: string
}) {
  const [open, setOpen] = useState(false)
  const [preferredSourceId, setPreferredSourceId] = useState<string>()
  const root = useRef<HTMLSpanElement>(null)
  const sources = distinctSources(chapter)
  const release = selectDefaultRelease(chapter, locale, preferredSourceId)

  useEffect(() => {
    setPreferredSourceId(
      localStorage.getItem(sourcePreferenceKey(seriesSlug)) ?? undefined,
    )
  }, [seriesSlug])

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", closeOutside)
    return () => document.removeEventListener("pointerdown", closeOutside)
  }, [])

  if (!release) {
    return (
      <span className="text-nv-muted-foreground text-sm">
        {locale === "tr"
          ? "Bu dilde uygun çeviri bulunamadı."
          : "No suitable translation is available in this language."}
      </span>
    )
  }

  const label = anonymousSourceLabel(release.source, sources, locale)
  const selectSource = (sourceId: string) => {
    const source = sources.find((item) => item.id === sourceId)
    const preference = source
      ? sourcePreferenceToken(source, sources)
      : sourceId
    localStorage.setItem(sourcePreferenceKey(seriesSlug), preference)
    setPreferredSourceId(preference)
    setOpen(false)
  }

  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-2 text-nv-muted-foreground text-sm">
      <span className="inline-flex items-center gap-1.5">
        <Globe2 aria-hidden="true" size={15} strokeWidth={1.75} />
        <span>{release.targetLanguage.toLocaleUpperCase("en")}</span>
      </span>
      <span aria-hidden="true">·</span>
      <span className="relative inline-flex items-center" ref={root}>
        {sources.length > 1 ? (
          <button
            aria-expanded={open}
            aria-haspopup="menu"
            className="inline-flex min-h-8 items-center gap-1 font-semibold text-foreground hover:text-nv-primary focus-visible:outline-2 focus-visible:outline-ring"
            onClick={() => setOpen((value) => !value)}
            type="button"
          >
            {label}
            <ChevronDown
              aria-hidden="true"
              className={open ? "rotate-180" : undefined}
              size={14}
            />
          </button>
        ) : (
          <span className="font-semibold text-foreground">{label}</span>
        )}
        {open ? (
          <span
            aria-label={
              locale === "tr" ? "Kaynak sürümü seç" : "Choose source edition"
            }
            className="absolute top-full left-0 z-20 mt-2 grid w-72 max-w-[80vw] gap-1 border border-nv-border bg-surface-raised p-2 text-foreground shadow-xl"
            role="menu"
          >
            {sources.map((source) => {
              const optionRelease = activeReleaseForSource(
                chapter,
                source.id,
                locale,
              )
              const optionLabel = anonymousSourceLabel(source, sources, locale)
              const content = (
                <>
                  <span className="flex items-center justify-between gap-3 font-semibold">
                    {optionLabel}
                    {source.id === release.source.id ? (
                      <Check aria-hidden="true" size={15} />
                    ) : null}
                  </span>
                  <span className="mt-1 block text-nv-muted-foreground text-xs">
                    {source.descriptions[locale]}
                  </span>
                  {!optionRelease ? (
                    <span className="mt-1 block text-danger text-xs">
                      {locale === "tr"
                        ? "Bu çıktı dilinde çeviri yok."
                        : "No translation in this output language."}
                    </span>
                  ) : null}
                </>
              )
              return optionRelease ? (
                <Link
                  className="block p-2 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring"
                  href={paths.reader(
                    locale,
                    seriesSlug,
                    chapter.number,
                    optionRelease.id,
                  )}
                  key={source.id}
                  onClick={() => selectSource(source.id)}
                  role="menuitem"
                >
                  {content}
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  className="block p-2 opacity-70"
                  key={source.id}
                  role="menuitem"
                  tabIndex={0}
                >
                  {content}
                </span>
              )
            })}
          </span>
        ) : null}
      </span>
      <SourceInfoPopover
        description={release.source.descriptions[locale]}
        label={label}
      />
      {release.translationType === "ai" ? (
        <>
          <span aria-hidden="true">·</span>
          <QualityBadge locale={locale} release={release} />
        </>
      ) : null}
    </span>
  )
}
