import {
  type CatalogFilters,
  filterSeries,
  publicSeries,
} from "~/features/platform/catalog"
import { copy } from "~/features/platform/copy"
import type { Locale } from "~/features/platform/domain"
import { translationProfiles } from "~/features/platform/fixtures"
import { EmptyState } from "./content"
import { SeriesCard } from "./series-card"

const types = ["WEBTOON", "MANGA", "MANHWA", "MANHUA", "COMIC", "LIGHT_NOVEL"]
const statuses = ["ONGOING", "COMPLETED", "HIATUS"]

export function CatalogPage({
  locale,
  filters,
  searchOnly = false,
}: {
  locale: Locale
  filters: CatalogFilters
  searchOnly?: boolean
}) {
  const t = copy[locale]
  const results = filterSeries(publicSeries, filters, locale)

  return (
    <main className="py-12 content-shell" id="main-content">
      <header className="max-w-3xl">
        <p className="font-semibold text-nv-primary text-sm uppercase tracking-[.15em]">
          NovoraScans katalog
        </p>
        <h1 className="mt-3 font-bold text-4xl tracking-tight">
          {searchOnly ? t.nav.search : t.discover.title}
        </h1>
        <p className="mt-3 text-nv-muted-foreground">
          {t.discover.description}
        </p>
      </header>

      <form
        action=""
        className="mt-8 grid gap-3 border border-nv-border bg-surface p-4 md:grid-cols-2 lg:grid-cols-6"
        method="get"
      >
        <label className="grid gap-1 text-sm lg:col-span-2">
          <span>{t.nav.search}</span>
          <input
            className="min-h-11 border border-input bg-background px-3 outline-none focus:border-ring"
            defaultValue={filters.q}
            name="q"
            placeholder={t.discover.search}
            type="search"
          />
        </label>
        {!searchOnly ? (
          <>
            <label className="grid gap-1 text-sm">
              <span>Format</span>
              <select
                className="min-h-11 border border-input bg-background px-3"
                defaultValue={filters.type}
                name="type"
              >
                <option value="">{t.discover.allTypes}</option>
                {types.map((type) => (
                  <option value={type} key={type}>
                    {type.replace("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span>{locale === "tr" ? "Durum" : "Status"}</span>
              <select
                className="min-h-11 border border-input bg-background px-3"
                defaultValue={filters.status}
                name="status"
              >
                <option value="">{t.discover.allStatuses}</option>
                {statuses.map((status) => (
                  <option value={status} key={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span>
                {locale === "tr" ? "Çeviri kalitesi" : "Translation quality"}
              </span>
              <select
                className="min-h-11 border border-input bg-background px-3"
                defaultValue={filters.profile}
                name="profile"
              >
                <option value="">
                  {locale === "tr" ? "Tüm profiller" : "All profiles"}
                </option>
                {translationProfiles.map((profile) => (
                  <option value={profile.slug} key={profile.id}>
                    {profile.labels[locale]}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span>{locale === "tr" ? "Sırala" : "Sort"}</span>
              <select
                className="min-h-11 border border-input bg-background px-3"
                defaultValue={filters.sort ?? "popular"}
                name="sort"
              >
                <option value="popular">{t.discover.popular}</option>
                <option value="updated">{t.discover.updated}</option>
              </select>
            </label>
          </>
        ) : null}
        <button
          className="min-h-11 self-end bg-nv-primary px-5 font-semibold text-nv-primary-foreground hover:bg-nv-primary-hover"
          type="submit"
        >
          {t.discover.submit}
        </button>
      </form>

      <div className="mt-10 flex items-baseline justify-between border-nv-border border-b pb-4">
        <h2 className="font-bold text-xl">
          {results.length} {t.common.results}
        </h2>
      </div>
      {results.length ? (
        <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {results.map((series, index) => (
            <SeriesCard
              locale={locale}
              priority={index < 2}
              series={series}
              key={series.id}
            />
          ))}
        </div>
      ) : (
        <div className="mt-6">
          <EmptyState>{t.discover.empty}</EmptyState>
        </div>
      )}
    </main>
  )
}
