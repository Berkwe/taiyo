import { Search } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { copy } from "~/features/platform/copy"
import type { Locale } from "~/features/platform/domain"
import { paths } from "~/features/platform/paths"
import { ThemeSwitcher } from "./theme-switcher"

export function LocaleSwitcher({ locale }: { locale: Locale }) {
  const target = locale === "tr" ? "en" : "tr"
  return (
    <Link
      className="inline-flex min-h-11 items-center rounded-md border border-nv-border px-3 font-semibold text-sm hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-ring"
      href={paths.home(target)}
      hrefLang={target}
      lang={target}
    >
      {target === "tr" ? "TR" : "EN"}
      <span className="sr-only">
        {target === "tr" ? " Türkçeye geç" : " Switch to English"}
      </span>
    </Link>
  )
}

export function AppHeader({ locale }: { locale: Locale }) {
  const t = copy[locale]
  return (
    <header className="sticky top-0 z-50 border-nv-border border-b bg-background/95 backdrop-blur">
      <div className="flex min-h-16 items-center gap-4 content-shell">
        <Link
          aria-label="NovoraScans ana sayfa"
          className="flex items-center gap-2 font-bold tracking-tight"
          href={paths.home(locale)}
        >
          <Image
            alt=""
            className="size-9 rounded object-cover"
            height={36}
            priority
            src="/novorascans-logo.png"
            width={36}
          />
          <span>NovoraScans</span>
        </Link>
        <nav
          aria-label={locale === "tr" ? "Ana navigasyon" : "Main navigation"}
          className="ml-4 hidden items-center gap-1 md:flex"
        >
          <Link
            className="rounded px-3 py-2 hover:bg-surface-raised"
            href={paths.home(locale)}
          >
            {t.nav.home}
          </Link>
          <Link
            className="rounded px-3 py-2 hover:bg-surface-raised"
            href={paths.discover(locale)}
          >
            {t.nav.discover}
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link
            aria-label={t.nav.search}
            className="inline-flex size-11 items-center justify-center rounded-md border border-nv-border bg-surface hover:bg-surface-raised"
            href={paths.search(locale)}
          >
            <Search aria-hidden="true" size={19} />
          </Link>
          <LocaleSwitcher locale={locale} />
          <ThemeSwitcher />
          <details className="relative md:hidden">
            <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-md border border-nv-border px-3 font-semibold">
              Menü
            </summary>
            <nav className="absolute top-12 right-0 grid min-w-48 gap-1 border border-nv-border bg-surface p-2 shadow-xl">
              <Link
                className="px-3 py-3 hover:bg-surface-raised"
                href={paths.home(locale)}
              >
                {t.nav.home}
              </Link>
              <Link
                className="px-3 py-3 hover:bg-surface-raised"
                href={paths.discover(locale)}
              >
                {t.nav.discover}
              </Link>
            </nav>
          </details>
        </div>
      </div>
    </header>
  )
}
