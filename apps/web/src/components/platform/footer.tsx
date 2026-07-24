import Link from "next/link"
import type { Locale } from "~/features/platform/domain"

export function Footer({ locale }: { locale: Locale }) {
  const links =
    locale === "tr"
      ? [
          ["Kullanım koşulları", "kullanim-kosullari"],
          ["Gizlilik", "gizlilik"],
          ["Telif ve kaldırma", "telif"],
          ["İletişim", "iletisim"],
        ]
      : [
          ["Terms", "terms"],
          ["Privacy", "privacy"],
          ["Copyright & takedown", "copyright"],
          ["Contact", "contact"],
        ]
  return (
    <footer className="site-footer mt-20 border-nv-border border-t bg-surface">
      <div className="grid gap-8 py-10 content-shell md:grid-cols-[1fr_auto]">
        <div>
          <p className="font-bold">NovoraScans</p>
          <p className="mt-2 max-w-xl text-nv-muted-foreground text-sm">
            {locale === "tr"
              ? "Lisanslı, izinli veya platforma ait içerikler için tasarlanan çok dilli okuma altyapısı."
              : "A multilingual reading foundation designed for licensed, permitted or platform-owned content."}
          </p>
        </div>
        <nav
          aria-label={locale === "tr" ? "Yasal bağlantılar" : "Legal links"}
          className="grid gap-2 text-sm sm:grid-cols-2"
        >
          {links.map(([label, slug]) => (
            <Link
              className="hover:text-nv-primary"
              href={`/${locale}/${slug}`}
              key={slug}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
