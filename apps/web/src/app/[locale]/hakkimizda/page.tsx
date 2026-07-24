import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { paths } from "~/features/platform/paths"
import { pageMetadata } from "~/features/platform/seo"

export const metadata: Metadata = pageMetadata({
  title: "Hakkımızda",
  description: "NovoraScans amacı ve iletişim bilgileri.",
  canonical: paths.about("tr"),
  locale: "tr",
})

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (locale !== "tr") notFound()
  return (
    <main className="py-16 content-shell" id="main-content">
      <p className="font-semibold text-nv-primary text-sm uppercase tracking-[.15em]">
        NovoraScans
      </p>
      <h1 className="mt-3 font-bold text-4xl">Hakkımızda</h1>
      <section className="mt-10 max-w-3xl space-y-8">
        <div>
          <h2 className="font-bold text-2xl">Amacımız</h2>
          <p className="mt-3 text-nv-muted-foreground leading-7">
            Webtoon, manga, manhwa ve çizgi romanları hızlı, sade ve
            erişilebilir bir okuma deneyimiyle buluşturmak. Bu alan ekip
            bilgileri hazır olduğunda ayrıntılandırılacaktır.
          </p>
        </div>
        <div>
          <h2 className="font-bold text-2xl">İletişim</h2>
          <p className="mt-3 text-nv-muted-foreground">
            İletişim bilgilerimiz yakında burada yer alacak.
          </p>
        </div>
      </section>
    </main>
  )
}
