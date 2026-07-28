import { db } from "@taiyomoe/db"
import type { User } from "better-auth"
import React from "react"
import { deliverAuthEmail } from "./email-delivery"

void React

export const sendVerificationEmail = async (
  data: {
    user: User
    url: string
    token: string
  },
  request?: Request,
) => {
  try {
    await deliverAuthEmail(async () => {
      const { SignUpEmail, sendEmail } = await import("@taiyomoe/email")
      return sendEmail({
        to: data.user.email,
        subject: "NovoraScans e-posta doğrulama",
        react: <SignUpEmail name={data.user.name} url={data.url} />,
      })
    })
  } catch (error) {
    const isSignUpRequest =
      request &&
      new URL(request.url).pathname.endsWith("/api/auth/sign-up/email")

    if (isSignUpRequest) {
      try {
        await db.$transaction(async (tx) => {
          await tx.account.deleteMany({ where: { userId: data.user.id } })
          await tx.session.deleteMany({ where: { userId: data.user.id } })
          await tx.user.deleteMany({
            where: { id: data.user.id, emailVerified: false },
          })
        })
      } catch (rollbackError) {
        console.error("[auth-email] Failed sign-up rollback failed", {
          code:
            rollbackError &&
            typeof rollbackError === "object" &&
            "code" in rollbackError &&
            typeof rollbackError.code === "string"
              ? rollbackError.code
              : "UNKNOWN_ERROR",
        })
      }
    }

    throw error
  }
}
