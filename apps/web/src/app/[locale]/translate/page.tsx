import { notFound } from "next/navigation"
import { isLocale } from "~/features/platform/domain"
import {
  TranslationLandingPage,
  translationLandingMetadata,
} from "~/features/translation/translation-landing-page"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  return translationLandingMetadata(locale, searchParams)
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  return <TranslationLandingPage locale={locale} searchParams={searchParams} />
}
