import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { paths } from "~/features/platform/paths"
import { pageMetadata } from "~/features/platform/seo"

export const metadata: Metadata = pageMetadata({
  title: "About",
  description: "The purpose of NovoraScans and contact information.",
  canonical: paths.about("en"),
  locale: "en",
})

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (locale !== "en") notFound()
  return (
    <main className="py-16 content-shell" id="main-content">
      <p className="font-semibold text-nv-primary text-sm uppercase tracking-[.15em]">
        NovoraScans
      </p>
      <h1 className="mt-3 font-bold text-4xl">About us</h1>
      <section className="mt-10 max-w-3xl space-y-8">
        <div>
          <h2 className="font-bold text-2xl">Our purpose</h2>
          <p className="mt-3 text-nv-muted-foreground leading-7">
            We bring webtoons, manga, manhwa and comics together in a fast,
            simple and accessible reading experience. Team details will be added
            here when ready.
          </p>
        </div>
        <div>
          <h2 className="font-bold text-2xl">Contact</h2>
          <p className="mt-3 text-nv-muted-foreground">
            Our contact details will be available here soon.
          </p>
        </div>
      </section>
    </main>
  )
}
