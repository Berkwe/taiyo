import { notFound } from "next/navigation"
import { AppHeader } from "~/components/platform/app-header"
import { Footer } from "~/components/platform/footer"
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

  return (
    <>
      <AppHeader locale={locale} />
      {children}
      <Footer locale={locale} />
    </>
  )
}
