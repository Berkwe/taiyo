import Link from "next/link"
import { copy } from "~/features/platform/copy"
import type { Chapter, Locale, Series } from "~/features/platform/domain"
import { paths } from "~/features/platform/paths"
import { absoluteUrl, breadcrumbJsonLd, JsonLd } from "~/features/platform/seo"
import { Breadcrumbs, ReleaseCard } from "./content"

export function ChapterDetail({
  chapter,
  locale,
  series,
}: {
  chapter: Chapter
  locale: Locale
  series: Series
}) {
  const t = copy[locale]
  const seriesTitle = series.localizations[locale].title
  const index = series.chapters.findIndex((item) => item.id === chapter.id)
  const previous = series.chapters[index - 1]
  const next = series.chapters[index + 1]
  const releases = chapter.releases
    .filter((release) => release.targetLanguage === locale)
    .sort(
      (a, b) =>
        Number(b.isCanonicalForLanguage) - Number(a.isCanonicalForLanguage) ||
        b.overallQualityScore - a.overallQualityScore,
    )

  return (
    <main className="py-10 content-shell" id="main-content">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "ComicIssue",
            name: `${seriesTitle} ${locale === "tr" ? "Bölüm" : "Chapter"} ${chapter.number}`,
            headline: chapter.localizations[locale].title,
            description: chapter.localizations[locale].description,
            datePublished: chapter.publishedAt,
            inLanguage: locale,
            url: absoluteUrl(
              paths.chapter(locale, series.slug, chapter.number),
            ),
            isPartOf: {
              "@type": "ComicSeries",
              name: seriesTitle,
              url: absoluteUrl(paths.series(locale, series.slug)),
            },
          },
          breadcrumbJsonLd([
            { name: t.nav.home, url: paths.home(locale) },
            { name: seriesTitle, url: paths.series(locale, series.slug) },
            {
              name: `${locale === "tr" ? "Bölüm" : "Chapter"} ${chapter.number}`,
              url: paths.chapter(locale, series.slug, chapter.number),
            },
          ]),
        ]}
      />
      <Breadcrumbs
        items={[
          { label: t.nav.home, href: paths.home(locale) },
          { label: seriesTitle, href: paths.series(locale, series.slug) },
          {
            label: `${locale === "tr" ? "Bölüm" : "Chapter"} ${chapter.number}`,
          },
        ]}
      />
      <header className="mt-10 max-w-4xl">
        <p className="font-semibold text-nv-primary">
          {seriesTitle} · {locale === "tr" ? "Bölüm" : "Chapter"}{" "}
          {chapter.number}
        </p>
        <h1 className="mt-3 text-balance font-bold text-4xl tracking-tight md:text-5xl">
          {chapter.localizations[locale].title}
        </h1>
        <p className="mt-4 text-lg text-nv-muted-foreground leading-8">
          {chapter.localizations[locale].description}
        </p>
        <p className="mt-4 text-nv-muted-foreground text-sm">
          <time dateTime={chapter.publishedAt}>
            {new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(
              new Date(chapter.publishedAt),
            )}
          </time>
        </p>
      </header>

      <section aria-labelledby="release-title" className="mt-12 max-w-5xl">
        <h2 className="font-bold text-2xl" id="release-title">
          {t.chapter.available}
        </h2>
        <p className="mt-2 text-nv-muted-foreground">
          {locale === "tr"
            ? "Sürüm seçimi yalnızca renk veya rozetle değil, kalite ayrıntılarıyla açıklanır."
            : "Editions are explained with quality details, not only colour or badges."}
        </p>
        <div className="mt-6 grid gap-3">
          {releases.map((release) => (
            <ReleaseCard
              href={paths.reader(
                locale,
                series.slug,
                chapter.number,
                release.id,
              )}
              locale={locale}
              release={release}
              key={release.id}
            />
          ))}
        </div>
      </section>

      <nav
        aria-label={
          locale === "tr" ? "Bölüm navigasyonu" : "Chapter navigation"
        }
        className="mt-12 grid gap-3 border-nv-border border-t pt-6 sm:grid-cols-2"
      >
        {previous ? (
          <Link
            className="border border-nv-border bg-surface p-4 hover:border-nv-primary"
            href={paths.chapter(locale, series.slug, previous.number)}
          >
            <span className="block text-nv-muted-foreground text-sm">
              {t.chapter.previous}
            </span>
            <strong>
              {locale === "tr" ? "Bölüm" : "Chapter"} {previous.number}
            </strong>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            className="border border-nv-border bg-surface p-4 text-right hover:border-nv-primary"
            href={paths.chapter(locale, series.slug, next.number)}
          >
            <span className="block text-nv-muted-foreground text-sm">
              {t.chapter.next}
            </span>
            <strong>
              {locale === "tr" ? "Bölüm" : "Chapter"} {next.number}
            </strong>
          </Link>
        ) : null}
      </nav>
    </main>
  )
}
