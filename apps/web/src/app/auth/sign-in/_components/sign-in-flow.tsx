"use client"

import { AnimatePresence } from "motion/react"
import { useEffect } from "react"
import { AuthAnimatedSlide } from "~/app/auth/_components/auth-animated-slide"
import { AuthVerificationEmailSent } from "~/app/auth/_components/auth-verification-email-sent"
import { useAuthStore } from "~/stores/auth-flow.store"
import { ForgotPasswordForm } from "./forgot-password-form"
import { ResetPasswordEmailSent } from "./reset-password-email-sent"
import { SignInFormEmail } from "./sign-in-form-email"

export const SignInFlow = () => {
  const page = useAuthStore((state) => state.page)
  const reset = useAuthStore((state) => state.reset)

  useEffect(() => () => reset(), [reset])

  return (
    <div className="w-full max-w-md">
      <AnimatePresence mode="wait" initial={false}>
        {page === 0 && (
          <AuthAnimatedSlide key="form">
            <SignInFormEmail />
          </AuthAnimatedSlide>
        )}
        {page === 1 && (
          <AuthAnimatedSlide key="verificationEmailSent">
            <AuthVerificationEmailSent />
          </AuthAnimatedSlide>
        )}
        {page === 2 && (
          <AuthAnimatedSlide key="forgotPassword">
            <ForgotPasswordForm />
          </AuthAnimatedSlide>
        )}
        {page === 3 && (
          <AuthAnimatedSlide key="resetPasswordEmailSent">
            <ResetPasswordEmailSent />
          </AuthAnimatedSlide>
        )}
      </AnimatePresence>
    </div>
  )
}
