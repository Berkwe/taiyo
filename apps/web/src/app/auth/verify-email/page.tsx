import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { getLocale, getTranslations } from "next-intl/server"
import type { Locale } from "~/features/platform/domain"
import { paths } from "~/features/platform/paths"
import { AuthPageTransition } from "../_components/auth-page-transition"
import { VerificationResult } from "./_components/verification-result"

type Props = {
  searchParams: Promise<{ error?: string; verified?: string }>
}

const errorKeys = {
  TOKEN_EXPIRED: "expired",
  INVALID_TOKEN: "invalid",
  USER_NOT_FOUND: "notFound",
  INVALID_USER: "invalid",
} as const

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()

  return {
    title:
      locale === "tr"
        ? "E-posta doğrulama | NovoraScans"
        : "Email verification | NovoraScans",
    description:
      locale === "tr"
        ? "NovoraScans e-posta doğrulama sonucu."
        : "Your NovoraScans email verification result.",
    robots: { index: false, follow: false },
  }
}

export default async function Page({ searchParams }: Props) {
  const { error, verified } = await searchParams
  const locale = (await getLocale()) as Locale
  const t = await getTranslations("auth.verificationResult")
  const errorKey =
    errorKeys[error as keyof typeof errorKeys] ?? ("unknown" as const)
  const status = !error && verified === "1" ? "success" : "error"

  return (
    <main
      className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-subtle p-4 md:gap-14 md:py-12 dark:bg-default"
      id="main-content"
    >
      <AuthPageTransition>
        <Link href={paths.home(locale)} aria-label="NovoraScans ana sayfa">
          <Image
            alt="NovoraScans"
            className="h-auto w-44 object-contain sm:w-56"
            height={941}
            priority
            src="/assets/brand/novora-stacked-logo.png"
            width={1672}
          />
        </Link>
        <VerificationResult
          description={
            status === "success"
              ? t("success.description")
              : t(`errors.${errorKey}.description`)
          }
          homeHref={paths.home(locale)}
          homeLabel={t("home")}
          redirectLabel={t("success.redirect", { seconds: "{seconds}" })}
          signInLabel={t("signIn")}
          status={status}
          title={
            status === "success"
              ? t("success.title")
              : t(`errors.${errorKey}.title`)
          }
        />
      </AuthPageTransition>
    </main>
  )
}
