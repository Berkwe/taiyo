import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  SectionHeader,
  TranslationProfileBadge,
} from "~/components/platform/content"
import { ContinueReadingCard } from "~/components/platform/continue-reading-card"
import { SeriesCard } from "~/components/platform/series-card"
import { publicSeries } from "~/features/platform/catalog"
import { copy } from "~/features/platform/copy"
import { isLocale, locales } from "~/features/platform/domain"
import { paths } from "~/features/platform/paths"
import {
  absoluteUrl,
  JsonLd,
  localeAlternates,
  pageMetadata,
} from "~/features/platform/seo"
import { siteConfig } from "~/site-config"

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const title =
    locale === "tr"
      ? "Türkçe Webtoon, Manga ve Manhwa Oku"
      : "Read Webtoons, Manga and Manhwa"
  const description =
    locale === "tr"
      ? "AI Ultra, AI Standart ve topluluk çeviri sürümleriyle Türkçe webtoon, manga ve manhwa keşfedin."
      : "Discover webtoons, manga and manhwa with AI Ultra, AI Standard and community translation editions."
  return pageMetadata({
    title,
    description,
    canonical: paths.home(locale),
    alternates: localeAlternates(paths.home("tr"), paths.home("en")),
    locale,
  })
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const t = copy[locale]
  const latest = [...publicSeries].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  )
  const genres = [
    ...new Set(publicSeries.flatMap((series) => series.genres)),
  ].slice(0, 8)

  return (
    <main id="main-content">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: siteConfig.name,
            url: absoluteUrl(paths.home(locale)),
            logo: absoluteUrl("/novorascans-logo.png"),
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: siteConfig.name,
            url: absoluteUrl(paths.home(locale)),
            inLanguage: locale,
            potentialAction: {
              "@type": "SearchAction",
              target: `${absoluteUrl(paths.search(locale))}?q={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
          },
        ]}
      />
      <section className="border-nv-border border-b bg-surface">
        <div className="grid min-h-[420px] items-center gap-10 py-16 content-shell lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <p className="font-semibold text-nv-primary text-sm uppercase tracking-[.16em]">
              {t.hero.eyebrow}
            </p>
            <h1 className="mt-4 max-w-3xl text-balance font-bold text-4xl tracking-[-.04em] sm:text-5xl lg:text-6xl">
              {t.hero.title}
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-nv-muted-foreground leading-8">
              {t.hero.description}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className="inline-flex min-h-12 items-center bg-nv-primary px-6 font-semibold text-nv-primary-foreground hover:bg-nv-primary-hover"
                href={paths.discover(locale)}
              >
                {t.hero.primary}
              </Link>
              <a
                className="inline-flex min-h-12 items-center border border-nv-border bg-background px-6 font-semibold hover:bg-surface-raised"
                href="#quality-profiles"
              >
                {t.hero.secondary}
              </a>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3" aria-hidden="true">
            {publicSeries.slice(0, 3).map((series, index) => (
              <div
                className={`overflow-hidden border border-nv-border bg-surface-raised ${index === 1 ? "translate-y-8" : ""}`}
                key={series.id}
              >
                {/* Decorative duplication: linked, accessible posters are shown below. */}
                <Image
                  alt=""
                  className="aspect-[2/3] object-cover"
                  height={600}
                  src={series.cover}
                  width={400}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <ContinueReadingCard locale={locale} />

      <section className="pt-16 content-shell">
        <SectionHeader
          action={t.common.viewAll}
          href={paths.discover(locale)}
          title={t.sections.latest}
        />
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
          {latest.map((series, index) => (
            <SeriesCard
              locale={locale}
              priority={index < 2}
              series={series}
              key={series.id}
            />
          ))}
        </div>
      </section>

      <section className="pt-20 content-shell">
        <SectionHeader title={t.sections.trending} />
        <div className="grid gap-4 md:grid-cols-3">
          {publicSeries.slice(0, 3).map((series, index) => (
            <Link
              className="grid grid-cols-[auto_1fr] items-center gap-4 border-nv-border border-t py-4 hover:text-nv-primary"
              href={paths.series(locale, series.slug)}
              key={series.id}
            >
              <span className="font-bold text-4xl text-nv-muted-foreground">
                0{index + 1}
              </span>
              <span>
                <strong className="block">
                  {series.localizations[locale].title}
                </strong>
                <small className="text-nv-muted-foreground">
                  {series.genres.join(" · ")}
                </small>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="pt-20 content-shell" id="quality-profiles">
        <SectionHeader title={t.sections.quality} />
        <div className="grid gap-px border border-nv-border bg-nv-border md:grid-cols-3">
          {["profile-ai-ultra", "profile-ai-standard", "profile-community"].map(
            (profileId) => (
              <article className="bg-surface p-6" key={profileId}>
                <TranslationProfileBadge
                  locale={locale}
                  profileId={profileId}
                />
                <p className="mt-4 text-nv-muted-foreground leading-7">
                  {profileId === "profile-ai-ultra"
                    ? locale === "tr"
                      ? "Sözlük, karakter hafızası ve editör kontrolüyle bağlamı koruyan premium sürüm."
                      : "A premium edition preserving context with glossary, character memory and editorial review."
                    : profileId === "profile-ai-standard"
                      ? locale === "tr"
                        ? "Daha hızlı yayın temposu için otomatik kontrollerle dengelenen sürüm."
                        : "A balanced edition using automated checks for a faster release cadence."
                      : locale === "tr"
                        ? "Topluluk çevirmenleri ve editörlerinin hazırladığı alternatif yorum."
                        : "An alternative interpretation by community translators and editors."}
                </p>
              </article>
            ),
          )}
        </div>
      </section>

      <section className="py-20 content-shell">
        <SectionHeader title={t.sections.genres} />
        <div className="flex flex-wrap gap-2">
          {genres.map((genre) => (
            <Link
              className="min-h-11 border border-nv-border bg-surface px-4 py-2.5 hover:border-nv-primary hover:text-nv-primary"
              href={paths.genre(locale, genre)}
              key={genre}
            >
              {genre}
            </Link>
          ))}
        </div>
        <div className="mt-16 max-w-4xl border-nv-border border-t pt-10">
          <h2 className="font-bold text-2xl">
            {locale === "tr"
              ? "Manga, manhwa ve webtoon arasında ne fark var?"
              : "What is the difference between manga, manhwa and webtoons?"}
          </h2>
          <p className="mt-4 text-nv-muted-foreground leading-7">
            {locale === "tr"
              ? "Manga çoğunlukla Japonya, manhwa Kore ve manhua Çin kökenli çizgi anlatıları tanımlar. Webtoon ise özellikle telefon ekranında kesintisiz dikey okumaya uygun yayın biçimidir. NovoraScans her formatı kendi okuma ritmine saygı duyan ortak bir katalogda sunar."
              : "Manga generally describes Japanese comics, manhwa Korean comics and manhua Chinese comics. Webtoon is a publishing format made for continuous vertical reading, especially on phones. NovoraScans brings them together while respecting each format's reading rhythm."}
          </p>
        </div>
      </section>
    </main>
  )
}
