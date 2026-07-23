import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { isLocale } from "~/features/platform/domain"
import { pageMetadata } from "~/features/platform/seo"

const legalPages = {
  tr: {
    "kullanim-kosullari": [
      "Kullanım koşulları",
      "Platform kullanımının temel kuralları ve sorumluluklar.",
    ],
    gizlilik: ["Gizlilik", "Veri işleme yaklaşımımız ve kullanıcı tercihleri."],
    telif: [
      "Telif ve içerik kaldırma",
      "Hak sahipleri için iletişim ve içerik kaldırma süreci.",
    ],
    iletisim: ["İletişim", "NovoraScans ekibiyle iletişim kurun."],
  },
  en: {
    terms: [
      "Terms of use",
      "Core rules and responsibilities for using the platform.",
    ],
    privacy: [
      "Privacy",
      "Our approach to data processing and user preferences.",
    ],
    copyright: [
      "Copyright and takedown",
      "Contact and takedown process for rights holders.",
    ],
    contact: ["Contact", "Get in touch with the NovoraScans team."],
  },
} as const

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; legal: string }>
}): Promise<Metadata> {
  const { locale, legal } = await params
  if (!isLocale(locale)) return {}
  const page = (
    legalPages[locale] as Record<string, readonly [string, string]>
  )[legal]
  if (!page) return {}
  return pageMetadata({
    title: page[0],
    description: page[1],
    canonical: `/${locale}/${legal}`,
    locale,
  })
}

export default async function LegalPage({
  params,
}: {
  params: Promise<{ locale: string; legal: string }>
}) {
  const { locale, legal } = await params
  if (!isLocale(locale)) notFound()
  const page = (
    legalPages[locale] as Record<string, readonly [string, string]>
  )[legal]
  if (!page) notFound()
  return (
    <main className="max-w-4xl py-16 content-shell" id="main-content">
      <h1 className="font-bold text-4xl">{page[0]}</h1>
      <p className="mt-5 text-lg text-nv-muted-foreground">{page[1]}</p>
      <div className="mt-10 space-y-5 border-nv-border border-t pt-8 leading-7">
        <p>
          {locale === "tr"
            ? "Bu sayfa ilk ürün temeli için hazırlanmış yer tutucu metindir ve hukuk danışmanlığı değildir. Üretim yayını öncesinde yetkin bir hukuk uzmanı tarafından gözden geçirilmelidir."
            : "This page is placeholder copy for the initial product foundation and is not legal advice. Qualified counsel should review it before production launch."}
        </p>
        <p>
          {locale === "tr"
            ? "NovoraScans yalnızca lisanslı, izinli veya platforma ait içeriklerle çalışacak biçimde tasarlanmıştır."
            : "NovoraScans is designed to operate only with licensed, permitted or platform-owned content."}
        </p>
      </div>
    </main>
  )
}
