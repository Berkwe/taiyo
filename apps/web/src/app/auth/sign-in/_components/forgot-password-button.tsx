import { useTranslations } from "next-intl"
import { useAuthStore } from "~/stores/auth-flow.store"

export const ForgotPasswordButton = ({ email }: { email: string }) => {
  const goToStep = useAuthStore((state) => state.goToStep)
  const setForgotPasswordEmail = useAuthStore(
    (state) => state.setForgotPasswordEmail,
  )
  const t = useTranslations("auth.forgotPassword")

  const handleClick = () => {
    setForgotPasswordEmail(email)
    goToStep("forgotPassword")
  }

  return (
    <button
      className="transition hover:text-subtle"
      onClick={handleClick}
      tabIndex={-1}
      type="button"
    >
      {t("title")}
    </button>
  )
}
