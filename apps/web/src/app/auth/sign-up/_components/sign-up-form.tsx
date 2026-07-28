import { zodResolver } from "@hookform/resolvers/zod"
import { authClient } from "@taiyomoe/auth/client"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { pick } from "radash"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { AuthGoogleButton } from "~/app/auth/_components/auth-google-button"
import { AuthSubmitButton } from "~/app/auth/_components/auth-submit-button"
import { useHandleAuthError } from "~/app/hooks/use-handle-auth-error"
import { EmailField } from "~/components/fields/email-field"
import { PasswordField } from "~/components/fields/password-field"
import { TextField } from "~/components/fields/text-field"
import { TurnstileField } from "~/components/fields/turnstile-field"
import { Form } from "~/components/ui/form"
import { Separator } from "~/components/ui/separator"
import { type SignUpInput, signUpSchema } from "~/schemas/users.schemas"
import { useAuthStore } from "~/stores/auth-flow.store"

export const SignUpForm = () => {
  const goToStep = useAuthStore((state) => state.goToStep)
  const setSignUpDraft = useAuthStore((state) => state.setSignUpDraft)
  const signUpDraft = useAuthStore((state) => state.signUpDraft)
  const { handleError } = useHandleAuthError()
  const t = useTranslations()
  const form = useForm({
    resolver: zodResolver(signUpSchema),
    mode: "onTouched",
    defaultValues: {
      ...signUpDraft,
      turnstileToken: "",
    },
  })

  useEffect(() => {
    const subscription = form.watch((values) => {
      setSignUpDraft({
        username: values.username ?? "",
        email: values.email ?? "",
        password: values.password ?? "",
        confirmPassword: values.confirmPassword ?? "",
      })
    })

    return () => subscription.unsubscribe()
  }, [form, setSignUpDraft])

  const handlePress = async (values: SignUpInput) => {
    await authClient.signUp.email({
      ...pick(values, ["email", "username", "password"]),
      name: values.username,
      callbackURL: "/tr",
      fetchOptions: {
        headers: { "x-captcha-response": values.turnstileToken },
        onSuccess: () => goToStep("verificationEmailSent"),
        onError: handleError("signUp.error"),
      },
    })
  }

  return (
    <div className="rounded-2xl border border-nv-border bg-surface p-6 shadow-xl sm:p-8">
      <div className="mb-6 space-y-2">
        <h1 className="font-bold text-2xl">{t("auth.signUp.title")}</h1>
        <p className="text-nv-muted-foreground text-sm">
          {t("auth.signUp.description")}
        </p>
      </div>
      <AuthGoogleButton />
      <Separator className="my-6 w-full bg-emphasis">
        {t("global.or")}
      </Separator>
      <Form {...form} onSubmit={handlePress}>
        <TextField
          control={form.control}
          name="username"
          label={t("global.username")}
          placeholder="rdx"
        />
        <EmailField control={form.control} name="email" />
        <PasswordField
          autoComplete="new-password"
          control={form.control}
          name="password"
          showStrength
        />
        <PasswordField
          autoComplete="off"
          control={form.control}
          name="confirmPassword"
          label={t("global.confirmPassword")}
        />
        <TurnstileField control={form.control} name="turnstileToken" />
        <AuthSubmitButton label="signUp.title" />
      </Form>
      <p className="mt-6 text-center text-nv-muted-foreground text-sm">
        {t("auth.signUp.hasAccount")}{" "}
        <Link
          className="font-semibold text-nv-primary hover:underline"
          href="/auth/sign-in"
        >
          {t("auth.signUp.signIn")}
        </Link>
      </p>
    </div>
  )
}
