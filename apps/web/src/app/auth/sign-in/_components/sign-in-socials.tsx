import { Button } from "@taiyomoe/ui/components/button"
import { ArrowRightIcon } from "lucide-react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { AuthGoogleButton } from "~/app/auth/_components/auth-google-button"
import { Separator } from "~/components/ui/separator"
import { ShineButton } from "~/components/ui/shine-button"
import { useAuthStore } from "~/stores/auth-flow.store"

export const SignInSocials = () => {
  const { goToStep } = useAuthStore()
  const t = useTranslations()

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <AuthGoogleButton />
      </div>
      <Separator className="w-full bg-emphasis">{t("global.or")}</Separator>
      <div className="space-y-2">
        <ShineButton
          className="hover:[&_svg]:translate-x-1"
          onClick={() => goToStep("magicLink")}
        >
          {t("auth.magicLink")}
          <ArrowRightIcon />
        </ShineButton>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="outline" onClick={() => goToStep("email")}>
            {t("auth.email")}
          </Button>
          <Button variant="outline" onClick={() => goToStep("username")}>
            {t("auth.username")}
          </Button>
        </div>
        <Link
          href="/auth/sign-up"
          className="mt-2 block text-center text-sm text-subtle hover:underline"
        >
          {t("auth.signIn.action")}
        </Link>
      </div>
    </div>
  )
}
