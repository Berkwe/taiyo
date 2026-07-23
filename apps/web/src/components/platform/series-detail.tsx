import Image from "next/image"
import Link from "next/link"
import type { CSSProperties } from "react"
import { copy } from "~/features/platform/copy"
import type { Locale, Series } from "~/features/platform/domain"
import { getProfile } from "~/features/platform/fixtures"
import { paths } from "~/features/platform/paths"
import { absoluteUrl, breadcrumbJsonLd, JsonLd } from "~/features/platform/seo"
import { siteConfig } from "~/site-config"
import { Breadcrumbs, TranslationProfileBadge } from "./content"

export function SeriesDetail({
  locale,
  series,
}: {
  locale: Locale
  series: Series
}) {
  const t = copy[locale]
  const localized = series.localizations[locale]
  const firstChapter = series.chapters[0]
  const defaultRelease =
    firstChapter?.releases.find(
      (release) =>
        release.targetLanguage === locale && release.isCanonicalForLanguage,
    ) ?? firstChapter?.releases[0]

  const profiles = [
    ...new Set(
      series.chapters.flatMap((chapter) =>
        chapter.releases
          .filter((release) => release.targetLanguage === locale)
          .map((release) => release.profileId),
      ),
    ),
  ]

  return (
    <main
      id="main-content"
      style={{ "--series-accent": series.accentColor } as CSSProperties}
    >
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "ComicSeries",
            name: localized.title,
            alternateName: series.aliases,
            description: localized.description,
            url: absoluteUrl(paths.series(locale, series.slug)),
            image: absoluteUrl(series.cover),
            inLanguage: locale,
            genre: series.genres,
            author: series.creators.map((creator) => ({
              "@type": "Person",
              name: creator.name,
            })),
            publisher: { "@type": "Organization", name: siteConfig.name },
          },
          breadcrumbJsonLd([
            { name: t.nav.home, url: paths.home(locale) },
            { name: t.nav.discover, url: paths.discover(locale) },
            { name: localized.title, url: paths.series(locale, series.slug) },
          ]),
        ]}
      />
      <section className="relative overflow-hidden border-nv-border border-b bg-surface">
        {series.banner ? (
          <Image
            alt=""
            className="absolute inset-0 size-full object-cover opacity-20"
            fill
            priority
            sizes="100vw"
            src={series.banner}
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/80 to-transparent" />
        <div className="relative py-8 content-shell">
          <Breadcrumbs
            items={[
              { label: t.nav.home, href: paths.home(locale) },
              { label: t.nav.discover, href: paths.discover(locale) },
              { label: localized.title },
            ]}
          />
          <div className="mt-8 grid gap-8 md:grid-cols-[220px_1fr] lg:gap-12">
            <div className="relative aspect-[2/3] overflow-hidden border border-nv-border bg-surface-raised shadow-xl">
              <Image
                alt={`${localized.title} ${locale === "tr" ? "kapak görseli" : "cover"}`}
                className="object-cover"
                fill
                priority
                sizes="220px"
                src={series.cover}
              />
            </div>
            <div className="self-end pb-2">
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="bg-accent px-2 py-1 font-semibold text-accent-foreground">
                  {series.type.replace("_", " ")}
                </span>
                <span className="border border-nv-border bg-surface px-2 py-1">
                  {series.status}
                </span>
                <span className="border border-nv-border bg-surface px-2 py-1">
                  {series.publicationYear}
                </span>
              </div>
              <h1 className="mt-5 text-balance font-bold text-4xl tracking-tight lg:text-6xl">
                {localized.title}
              </h1>
              <p className="mt-5 max-w-3xl text-lg text-nv-muted-foreground leading-8">
                {localized.description}
              </p>
              {defaultRelease && firstChapter ? (
                <Link
                  className="mt-7 inline-flex min-h-12 items-center bg-accent px-6 font-semibold text-accent-foreground hover:opacity-90"
                  href={paths.reader(
                    locale,
                    series.slug,
                    firstChapter.number,
                    defaultRelease.id,
                  )}
                >
                  {t.series.start}
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-12 py-12 content-shell lg:grid-cols-[1fr_320px]">
        <div>
          <section aria-labelledby="profiles-title">
            <h2 className="font-bold text-2xl" id="profiles-title">
              {t.series.profiles}
            </h2>
            <div className="mt-5 grid gap-3">
              {profiles.map((profileId) => {
                const profile = getProfile(profileId)
                if (!profile) return null
                return (
                  <article
                    className="border border-nv-border bg-surface p-5"
                    key={profile.id}
                  >
                    <TranslationProfileBadge
                      locale={locale}
                      profileId={profile.id}
                    />
                    <p className="mt-3 text-nv-muted-foreground">
                      {profile.descriptions[locale]}
                    </p>
                    <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                      <div>
                        <dt className="inline text-nv-muted-foreground">
                          AI:{" "}
                        </dt>
                        <dd className="inline">
                          {profile.isAiGenerated ? "Evet" : "Hayır"}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline text-nv-muted-foreground">
                          {locale === "tr"
                            ? "İnsan kontrolü: "
                            : "Human review: "}
                        </dt>
                        <dd className="inline">
                          {profile.isHumanReviewed ? "Evet" : "Hayır"}
                        </dd>
                      </div>
                    </dl>
                  </article>
                )
              })}
            </div>
          </section>

          <section aria-labelledby="chapters-title" className="mt-12">
            <h2 className="font-bold text-2xl" id="chapters-title">
              {t.series.chapters}
            </h2>
            <ol className="mt-5 divide-y divide-nv-border border-nv-border border-y">
              {[...series.chapters].reverse().map((chapter) => {
                const releases = chapter.releases.filter(
                  (release) => release.targetLanguage === locale,
                )
                return (
                  <li key={chapter.id}>
                    <Link
                      className="grid gap-3 py-5 hover:bg-surface md:grid-cols-[1fr_auto] md:items-center md:px-4"
                      href={paths.chapter(locale, series.slug, chapter.number)}
                    >
                      <span>
                        <strong>
                          {locale === "tr" ? "Bölüm" : "Chapter"}{" "}
                          {chapter.number}
                        </strong>
                        <small className="mt-1 block text-nv-muted-foreground">
                          {chapter.localizations[locale].title}
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
        </div>

        <aside className="space-y-8">
          <section>
            <h2 className="font-bold">{t.series.creators}</h2>
            <dl className="mt-3 grid gap-3 text-sm">
              {series.creators.map((creator) => (
                <div
                  className="border-nv-border border-b pb-3"
                  key={creator.name}
                >
                  <dt className="text-nv-muted-foreground">{creator.role}</dt>
                  <dd className="font-semibold">{creator.name}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section>
            <h2 className="font-bold">{t.series.aliases}</h2>
            <p className="mt-3 text-nv-muted-foreground text-sm">
              {series.aliases.join(" · ")}
            </p>
          </section>
          <section>
            <h2 className="font-bold">
              {locale === "tr" ? "Türler ve etiketler" : "Genres and tags"}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {[...series.genres, ...series.tags].map((tag) => (
                <span
                  className="border border-nv-border bg-surface px-2 py-1 text-sm"
                  key={tag}
                >
                  {tag}
                </span>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  )
}
