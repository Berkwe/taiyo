import { redirect } from "next/navigation"
import { MyTranslations } from "~/app/translate/serilerim/my-translations"
import { getDebugViewerRole } from "~/features/debug/viewer"
import { isLocale } from "~/features/platform/domain"
import { paths } from "~/features/platform/paths"
import { localeAlternates, pageMetadata } from "~/features/platform/seo"
import { getSession } from "~/utils/get-session"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  return pageMetadata({
    title: locale === "tr" ? "Çeviri Taleplerim" : "My Translation Requests",
    description:
      locale === "tr"
        ? "Desteklediğiniz AI çeviri taleplerini ve yayın durumlarını takip edin."
        : "Track the AI translation requests you support and their publication status.",
    canonical: paths.translateRequests(locale),
    alternates: localeAlternates(
      paths.translateRequests("tr"),
      paths.translateRequests("en"),
    ),
    locale,
    noIndex: true,
  })
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) redirect(paths.translate("tr"))
  const session = await getSession()
  const debugRole = await getDebugViewerRole()
  const authenticated =
    debugRole !== null ? debugRole !== "GUEST" : Boolean(session?.user)
  if (!authenticated) {
    redirect(
      `/auth/sign-in?callbackURL=${encodeURIComponent(paths.translateRequests(locale))}`,
    )
  }

  return (
    <main className="py-10 content-shell" id="main-content">
      <header className="max-w-3xl">
        <p className="font-semibold text-nv-primary text-sm uppercase tracking-[.16em]">
          {locale === "tr" ? "Novora AI Çeviri" : "Novora AI Translation"}
        </p>
        <h1 className="mt-3 font-bold text-4xl">
          {locale === "tr" ? "Çeviri Taleplerim" : "My Translation Requests"}
        </h1>
        <p className="mt-3 text-nv-muted-foreground">
          {locale === "tr"
            ? "Kredi verdiğin AI çeviri taleplerini, indirme durumunu ve tamamlanan yayınları buradan takip edebilirsin."
            : "Track the AI translation requests you supported, their download status, and completed releases."}
        </p>
      </header>
      <MyTranslations locale={locale} />
    </main>
  )
}
