import type { User } from "better-auth"
import React from "react"
import { deliverAuthEmail } from "./email-delivery"

void React

export const sendResetPassword = async (data: {
  user: User
  url: string
  token: string
}) => {
  await deliverAuthEmail(async () => {
    const { ResetPasswordEmail, sendEmail } = await import("@taiyomoe/email")
    return sendEmail({
      to: data.user.email,
      subject: "NovoraScans parola sıfırlama",
      react: <ResetPasswordEmail name={data.user.name} url={data.url} />,
    })
  })
}
