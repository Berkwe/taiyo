import { zodResolver } from "@hookform/resolvers/zod"
import { authClient } from "@taiyomoe/auth/client"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { pick } from "radash"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { AuthGoogleButton } from "~/app/auth/_components/auth-google-button"
import { useHandleAuthError } from "~/app/hooks/use-handle-auth-error"
import { CheckboxField } from "~/components/fields/checkbox-field"
import { EmailField } from "~/components/fields/email-field"
import { PasswordField } from "~/components/fields/password-field"
import { Form } from "~/components/ui/form"
import { Separator } from "~/components/ui/separator"
import {
  type SignInEmailInput,
  signInEmailSchema,
} from "~/schemas/users.schemas"
import { useAuthStore } from "~/stores/auth-flow.store"
import { safeReturnPath } from "~/utils/safe-return-path"
import { AuthSubmitButton } from "../../_components/auth-submit-button"
import { ForgotPasswordButton } from "./forgot-password-button"

export const SignInFormEmail = () => {
  const goToStep = useAuthStore((state) => state.goToStep)
  const signInDraft = useAuthStore((state) => state.signInDraft)
  const setSignInDraft = useAuthStore((state) => state.setSignInDraft)
  const { handleError } = useHandleAuthError()
  const t = useTranslations()
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackURL = safeReturnPath(searchParams.get("callbackURL"))
  const form = useForm({
    resolver: zodResolver(signInEmailSchema),
    mode: "onTouched",
    defaultValues: signInDraft,
  })

  useEffect(() => {
    const subscription = form.watch((values) => {
      setSignInDraft({
        email: values.email ?? "",
        password: values.password ?? "",
        rememberMe: values.rememberMe ?? true,
      })
    })

    return () => subscription.unsubscribe()
  }, [form, setSignInDraft])

  const handlePress = async (values: SignInEmailInput) => {
    await authClient.signIn.email({
      ...pick(values, ["email", "password", "rememberMe"]),
      fetchOptions: {
        onSuccess: ({ data }) => {
          toast.success(t("auth.signIn.success", { username: data?.user.name }))
          router.push(callbackURL)
          router.refresh()
        },
        onError: (error) => {
          if (
            error.error.code === "EMAIL_NOT_VERIFIED" ||
            error.error.code === "VERIFICATION_EMAIL_ALREADY_SENT"
          ) {
            goToStep("verificationEmailSent")

            return
          }

          handleError("signIn.error")(error)
        },
      },
    })
  }

  return (
    <div className="rounded-2xl border border-nv-border bg-surface p-6 shadow-xl sm:p-8">
      <div className="mb-6 space-y-2">
        <h1 className="font-bold text-2xl">{t("auth.signIn.title")}</h1>
        <p className="text-nv-muted-foreground text-sm">
          {t("auth.signIn.description")}
        </p>
      </div>
      <AuthGoogleButton callbackURL={callbackURL} />
      <Separator className="my-6 w-full bg-emphasis">
        {t("global.or")}
      </Separator>
      <Form {...form} onSubmit={handlePress}>
        <EmailField control={form.control} name="email" />
        <PasswordField
          autoComplete="current-password"
          control={form.control}
          name="password"
        >
          <ForgotPasswordButton />
        </PasswordField>
        <CheckboxField
          control={form.control}
          name="rememberMe"
          label={t("global.rememberMe")}
        />
        <AuthSubmitButton label="signIn.title" />
      </Form>
      <p className="mt-6 text-center text-nv-muted-foreground text-sm">
        {t("auth.signIn.noAccount")}{" "}
        <Link
          className="font-semibold text-nv-primary hover:underline"
          href="/auth/sign-up"
        >
          {t("auth.signIn.createAccount")}
        </Link>
      </p>
    </div>
  )
}
