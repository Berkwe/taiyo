"use client"

import { useEffect, useMemo, useState } from "react"
import { type CatalogFilters, filterSeries } from "~/features/platform/catalog"
import { copy } from "~/features/platform/copy"
import type { Locale, Series } from "~/features/platform/domain"
import { paths } from "~/features/platform/paths"
import { EmptyState } from "./content"
import { RandomSeriesButton } from "./random-series-button"
import { SeriesCard } from "./series-card"

const types = ["WEBTOON", "MANGA", "MANHWA", "MANHUA", "COMIC", "LIGHT_NOVEL"]
const statuses = ["ONGOING", "COMPLETED", "HIATUS"]

export function CatalogPage({
  locale,
  filters,
  series,
  searchOnly = false,
}: {
  locale: Locale
  filters: CatalogFilters
  series: Series[]
  searchOnly?: boolean
}) {
  const t = copy[locale]
  const [liveFilters, setLiveFilters] = useState<CatalogFilters>({
    q: filters.q ?? "",
    type: filters.type ?? "",
    status: filters.status ?? "",
    sort: filters.sort ?? "popular",
  })
  const results = useMemo(
    () => filterSeries(series, liveFilters, locale),
    [liveFilters, locale, series],
  )

  useEffect(() => {
    const parameters = new URLSearchParams()
    for (const [key, value] of Object.entries(liveFilters)) {
      if (value && !(key === "sort" && value === "popular"))
        parameters.set(key, value)
    }
    const query = parameters.toString()
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}`,
    )
  }, [liveFilters])

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
        {!searchOnly ? (
          <div className="mt-5">
            <RandomSeriesButton
              hrefs={series.map((item) => paths.series(locale, item.slug))}
              label={locale === "tr" ? "Rastgele seri" : "Random series"}
            />
          </div>
        ) : null}
      </header>

      <form
        className="mt-8 grid gap-3 border border-nv-border bg-surface p-4 md:grid-cols-2 lg:grid-cols-6"
        onSubmit={(event) => event.preventDefault()}
      >
        <label className="grid gap-1 text-sm lg:col-span-2">
          <span>{t.nav.search}</span>
          <input
            className="min-h-11 border border-input bg-background px-3 outline-none focus:border-ring"
            onChange={(event) =>
              setLiveFilters((current) => ({
                ...current,
                q: event.target.value,
              }))
            }
            name="q"
            placeholder={t.discover.search}
            type="search"
            value={liveFilters.q}
          />
        </label>
        {!searchOnly ? (
          <>
            <label className="grid gap-1 text-sm">
              <span>Format</span>
              <select
                className="min-h-11 border border-input bg-background px-3"
                onChange={(event) =>
                  setLiveFilters((current) => ({
                    ...current,
                    type: event.target.value,
                  }))
                }
                name="type"
                value={liveFilters.type}
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
                onChange={(event) =>
                  setLiveFilters((current) => ({
                    ...current,
                    status: event.target.value,
                  }))
                }
                name="status"
                value={liveFilters.status}
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
              <span>{locale === "tr" ? "Sırala" : "Sort"}</span>
              <select
                className="min-h-11 border border-input bg-background px-3"
                onChange={(event) =>
                  setLiveFilters((current) => ({
                    ...current,
                    sort: event.target.value as "popular" | "updated",
                  }))
                }
                name="sort"
                value={liveFilters.sort}
              >
                <option value="popular">{t.discover.popular}</option>
                <option value="updated">{t.discover.updated}</option>
              </select>
            </label>
          </>
        ) : null}
        <p className="self-end pb-3 text-nv-muted-foreground text-sm">
          {locale === "tr"
            ? "Sonuçlar yazdıkça güncellenir."
            : "Results update as you type."}
        </p>
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
