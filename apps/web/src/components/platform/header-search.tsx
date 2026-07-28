"use client"

import { ArrowRight, Search, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import type { Locale } from "~/features/platform/domain"
import { paths } from "~/features/platform/paths"
import type { PublicSeriesSearchItem } from "~/features/platform/server-series"
import { useAnimatedPresence } from "~/hooks/use-animated-presence"

export function HeaderSearch({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<PublicSeriesSearchItem[]>([])
  const [loading, setLoading] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const { motionState, rendered } = useAnimatedPresence(open)
  const detailedHref = `${paths.discover(locale)}${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`

  useEffect(() => {
    if (!open) return
    input.current?.focus()
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("pointerdown", close)
    window.addEventListener("keydown", closeOnEscape)
    return () => {
      document.removeEventListener("pointerdown", close)
      window.removeEventListener("keydown", closeOnEscape)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    setLoading(true)
    const timer = window.setTimeout(() => {
      const parameters = new URLSearchParams({
        locale,
        q: query.trim(),
      })
      void fetch(`/api/platform/series-search?${parameters}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          const body = (await response.json()) as {
            results?: PublicSeriesSearchItem[]
          }
          setResults(response.ok ? (body.results ?? []) : [])
        })
        .catch((error) => {
          if (!(error instanceof DOMException && error.name === "AbortError"))
            setResults([])
        })
        .finally(() => setLoading(false))
    }, 120)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [locale, open, query])

  return (
    <div className="relative" ref={root}>
      <button
        aria-expanded={open}
        aria-label={locale === "tr" ? "Seri ara" : "Search series"}
        className="inline-flex size-11 items-center justify-center rounded-md border border-nv-border bg-surface hover:bg-surface-raised"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {open ? (
          <X aria-hidden="true" size={19} />
        ) : (
          <Search aria-hidden="true" size={19} />
        )}
      </button>
      {rendered ? (
        <section
          aria-label={
            locale === "tr" ? "Canlı seri araması" : "Live series search"
          }
          className="-translate-x-1/2 fixed top-24 left-1/2 z-[80] w-[min(26rem,calc(100vw-2rem))] border border-nv-border bg-surface p-3 shadow-2xl sm:absolute sm:top-14 sm:right-0 sm:left-auto sm:translate-x-0"
          data-popup-motion={motionState}
        >
          <div className="relative">
            <Search
              aria-hidden="true"
              className="-translate-y-1/2 absolute top-1/2 left-3 text-nv-muted-foreground"
              size={18}
            />
            <input
              aria-label={
                locale === "tr" ? "Seri adı yazın" : "Type a series title"
              }
              className="min-h-12 w-full border border-input bg-background pr-10 pl-10 outline-none focus:border-ring"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={
                locale === "tr"
                  ? "Seri, yazar veya tür ara"
                  : "Search series, creator or genre"
              }
              ref={input}
              type="search"
              value={query}
            />
          </div>
          <div className="mt-2 max-h-[min(26rem,60vh)] overflow-y-auto">
            {loading && !results.length ? (
              <p className="p-6 text-center text-nv-muted-foreground text-sm">
                {locale === "tr" ? "Seriler aranıyor…" : "Searching series…"}
              </p>
            ) : results.length ? (
              <ul className="divide-y divide-nv-border">
                {results.map((series) => (
                  <li key={series.id}>
                    <Link
                      className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 p-2 hover:bg-surface-raised"
                      href={paths.series(locale, series.slug)}
                      onClick={() => setOpen(false)}
                    >
                      <Image
                        alt=""
                        className="aspect-[2/3] w-12 rounded object-cover"
                        height={72}
                        src={series.cover}
                        width={48}
                      />
                      <span className="min-w-0">
                        <strong className="block truncate text-sm">
                          {series.title}
                        </strong>
                        <small className="block truncate text-nv-muted-foreground">
                          {series.type.replace("_", " ")}
                          {series.genre ? ` · ${series.genre}` : ""}
                        </small>
                      </span>
                      <ArrowRight aria-hidden="true" size={17} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-6 text-center text-nv-muted-foreground text-sm">
                {locale === "tr"
                  ? "Eşleşen seri bulunamadı."
                  : "No matching series."}
              </p>
            )}
          </div>
          <Link
            className="mt-2 flex min-h-11 items-center justify-center gap-2 bg-nv-primary px-4 font-semibold text-nv-primary-foreground"
            href={detailedHref}
            onClick={() => setOpen(false)}
          >
            {locale === "tr"
              ? "Ayrıntılı filtreleri aç"
              : "Open detailed filters"}
            <ArrowRight aria-hidden="true" size={17} />
          </Link>
        </section>
      ) : null}
    </div>
  )
}
