import { notFound } from "next/navigation"
import { AppHeader } from "~/components/platform/app-header"
import { DebugRoleSwitcher } from "~/components/platform/debug-role-switcher"
import { Footer } from "~/components/platform/footer"
import { getDebugViewerRole, isDebugMode } from "~/features/debug/viewer"
import { isLocale, locales } from "~/features/platform/domain"

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const debugRole = isDebugMode()
    ? ((await getDebugViewerRole()) ?? "GUEST")
    : null

  return (
    <>
      <AppHeader locale={locale} />
      {children}
      <Footer locale={locale} />
      {debugRole ? <DebugRoleSwitcher initialRole={debugRole} /> : null}
    </>
  )
}
