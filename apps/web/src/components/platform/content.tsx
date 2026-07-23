import Link from "next/link"
import type { ReactNode } from "react"
import type { ChapterRelease, Locale } from "~/features/platform/domain"
import { getProfile } from "~/features/platform/fixtures"

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

export function TranslationProfileBadge({
  profileId,
  locale,
  recommended,
}: {
  profileId: string
  locale: Locale
  recommended?: boolean
}) {
  const profile = getProfile(profileId)
  if (!profile) return null
  return (
    <span className="inline-flex items-center gap-1 rounded-sm border border-nv-border bg-nv-primary-soft px-2 py-1 font-semibold text-foreground text-xs">
      {profile.labels[locale]}
      {recommended ? (
        <span title={locale === "tr" ? "Önerilen" : "Recommended"}>
          <span aria-hidden="true">★</span>
          <span className="sr-only">
            {locale === "tr" ? "Önerilen" : "Recommended"}
          </span>
        </span>
      ) : null}
    </span>
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
  release,
  locale,
  href,
}: {
  release: ChapterRelease
  locale: Locale
  href: string
}) {
  const profile = getProfile(release.profileId)
  return (
    <article className="grid gap-4 border border-nv-border bg-surface p-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <TranslationProfileBadge
            locale={locale}
            profileId={release.profileId}
            recommended={release.isCanonicalForLanguage}
          />
          <span className="text-nv-muted-foreground text-sm">
            {release.targetLanguage.toLocaleUpperCase()} ·{" "}
            {release.releaseGroup}
          </span>
        </div>
        <p className="mt-2 text-nv-muted-foreground text-sm">
          {profile?.descriptions[locale]}
        </p>
        <p className="mt-2 text-sm">
          {locale === "tr" ? "Kalite skoru" : "Quality score"}:{" "}
          <strong>{release.overallQualityScore}/100</strong>
          {release.humanReviewed
            ? ` · ${locale === "tr" ? "İnsan kontrollü" : "Human reviewed"}`
            : ""}
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
      className="grid animate-pulse grid-cols-2 gap-4 md:grid-cols-4"
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <div className="aspect-[2/3] bg-surface-raised" key={index} />
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
