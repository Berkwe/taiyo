import { useTranslations } from "next-intl"
import { useAuthStore } from "~/stores/auth-flow.store"

export const ForgotPasswordButton = () => {
  const goToStep = useAuthStore((state) => state.goToStep)
  const setForgotPasswordEmail = useAuthStore(
    (state) => state.setForgotPasswordEmail,
  )
  const signInEmail = useAuthStore((state) => state.signInDraft.email)
  const t = useTranslations("auth.forgotPassword")

  const handleClick = () => {
    setForgotPasswordEmail(signInEmail)
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
