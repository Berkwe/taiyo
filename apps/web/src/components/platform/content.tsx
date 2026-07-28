import Link from "next/link"
import type { ReactNode } from "react"
import type {
  Chapter,
  ChapterRelease,
  Locale,
} from "~/features/platform/domain"
import {
  qualityLabel,
  releaseSourceLabel,
} from "~/features/platform/source-editions"
import { SourceInfoPopover } from "./source-info-popover"

export function SectionHeader({
  title,
  href,
  action,
}: {
  title: string
  href?: string
  action?: string
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <h2 className="text-balance font-bold text-2xl tracking-tight">
        {title}
      </h2>
      {href ? (
        <Link
          className="shrink-0 text-nv-primary text-sm hover:underline"
          href={href}
        >
          {action}
        </Link>
      ) : null}
    </div>
  )
}

export function Breadcrumbs({
  items,
}: {
  items: { label: string; href?: string }[]
}) {
  return (
    <nav aria-label="Breadcrumb" className="text-nv-muted-foreground text-sm">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => (
          <li
            className="flex items-center gap-2"
            key={`${item.label}-${index}`}
          >
            {index ? <span aria-hidden="true">/</span> : null}
            {item.href ? (
              <Link className="hover:text-foreground" href={item.href}>
                {item.label}
              </Link>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function ReleaseCard({
  chapter,
  release,
  locale,
  href,
}: {
  chapter: Chapter
  release: ChapterRelease
  locale: Locale
  href: string
}) {
  const sourceLabel = releaseSourceLabel(chapter, release, locale)
  return (
    <article className="grid gap-4 border border-nv-border bg-surface p-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-nv-muted-foreground text-sm">
            {release.targetLanguage.toLocaleUpperCase("en")} · {sourceLabel}
          </span>
          <SourceInfoPopover
            description={release.source.descriptions[locale]}
            label={sourceLabel}
          />
          {release.translationType === "ai" ? (
            <span
              className={
                release.qualityTier === "premium"
                  ? "quality-badge-premium"
                  : "quality-badge-balanced"
              }
            >
              {qualityLabel(release.qualityTier, locale)}
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-nv-muted-foreground text-sm">
          {release.source.descriptions[locale]}
        </p>
      </div>
      <Link
        className="inline-flex min-h-11 items-center justify-center bg-nv-primary px-4 font-semibold text-nv-primary-foreground hover:bg-nv-primary-hover"
        href={href}
      >
        {locale === "tr" ? "Oku" : "Read"}
      </Link>
    </article>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="border border-nv-border border-dashed bg-surface p-10 text-center text-nv-muted-foreground">
      {children}
    </div>
  )
}

export function LoadingSkeleton() {
  return (
    <output
      aria-label="Yükleniyor"
      className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <div className="overflow-hidden" key={index}>
          <div className="aspect-[2/3] animate-pulse bg-surface-raised" />
          <div className="mt-3 h-5 w-4/5 animate-pulse rounded bg-surface-raised" />
          <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-surface-raised" />
        </div>
      ))}
    </output>
  )
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="border border-danger bg-surface p-6 text-danger"
    >
      {message}
    </div>
  )
}
