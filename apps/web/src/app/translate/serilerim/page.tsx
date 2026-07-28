import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { AppHeader } from "~/components/platform/app-header"
import { Footer } from "~/components/platform/footer"
import { getDebugViewerRole } from "~/features/debug/viewer"
import { getSession } from "~/utils/get-session"
import { MyTranslations } from "./my-translations"

export const metadata: Metadata = {
  title: "Çeviri Taleplerim",
  description:
    "Kredi verdiğiniz AI çeviri taleplerini ve Mandown yayın durumlarını takip edin.",
  robots: { index: false, follow: false },
}

export default async function MyTranslationsPage() {
  const session = await getSession()
  const debugRole = await getDebugViewerRole()
  const authenticated =
    debugRole !== null ? debugRole !== "GUEST" : Boolean(session?.user)
  if (!authenticated) {
    redirect(
      `/auth/sign-in?callbackURL=${encodeURIComponent("/translate/serilerim")}`,
    )
  }
  return (
    <>
      <AppHeader locale="tr" />
      <main className="py-10 content-shell" id="main-content">
        <header className="max-w-3xl">
          <p className="font-semibold text-nv-primary text-sm uppercase tracking-[.16em]">
            Novora AI Çeviri
          </p>
          <h1 className="mt-3 font-bold text-4xl">Çeviri Taleplerim</h1>
          <p className="mt-3 text-nv-muted-foreground">
            Kredi verdiğin AI çeviri taleplerini, indirme durumunu ve tamamlanan
            yayınları buradan takip edebilirsin.
          </p>
        </header>
        <MyTranslations />
      </main>
      <Footer locale="tr" />
    </>
  )
}
