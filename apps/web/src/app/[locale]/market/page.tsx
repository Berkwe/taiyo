import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { isLocale } from "~/features/platform/domain"
import { paths } from "~/features/platform/paths"
import { localeAlternates, pageMetadata } from "~/features/platform/seo"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  return pageMetadata({
    title: locale === "tr" ? "Market" : "Market",
    description:
      locale === "tr"
        ? "NovoraScans market alanı yakında açılacak."
        : "The NovoraScans market is coming soon.",
    canonical: paths.market(locale),
    alternates: localeAlternates(paths.market("tr"), paths.market("en")),
    locale,
    noIndex: true,
  })
}

export default async function MarketPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  return (
    <main
      className="grid min-h-[55vh] place-content-center py-16 text-center content-shell"
      id="main-content"
    >
      <p className="font-semibold text-nv-primary text-sm uppercase tracking-[.15em]">
        NovoraScans
      </p>
      <h1 className="mt-3 font-bold text-4xl">Market</h1>
      <p className="mt-4 text-nv-muted-foreground">
        {locale === "tr" ? "Yakında burada." : "Coming soon."}
      </p>
    </main>
  )
}
