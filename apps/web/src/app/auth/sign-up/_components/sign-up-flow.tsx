"use client"

import { AnimatePresence } from "motion/react"
import { useEffect } from "react"
import { AuthAnimatedSlide } from "~/app/auth/_components/auth-animated-slide"
import { AuthVerificationEmailSent } from "~/app/auth/_components/auth-verification-email-sent"
import { useAuthStore } from "~/stores/auth-flow.store"
import { SignUpForm } from "./sign-up-form"

export const SignUpFlow = () => {
  const page = useAuthStore((state) => state.page)
  const reset = useAuthStore((state) => state.reset)

  useEffect(() => () => reset(), [reset])

  return (
    <div className="w-full max-w-md">
      <AnimatePresence mode="wait" initial={false}>
        {page === 0 && (
          <AuthAnimatedSlide key="form">
            <SignUpForm />
          </AuthAnimatedSlide>
        )}
        {page === 1 && (
          <AuthAnimatedSlide key="verificationEmailSent">
            <AuthVerificationEmailSent />
          </AuthAnimatedSlide>
        )}
      </AnimatePresence>
    </div>
  )
}
