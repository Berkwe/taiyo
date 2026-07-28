import { render } from "@react-email/render"
import nodemailer from "nodemailer"
import type { ReactElement } from "react"
import { Resend } from "resend"
import { env } from "./env"
import ResetPasswordEmail from "./templates/reset-password-email"
import SignUpEmail from "./templates/sign-up-email"

const smtp = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  ...(env.SMTP_USER
    ? {
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASSWORD,
        },
      }
    : {}),
})

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null

export async function sendEmail(input: {
  to: string
  subject: string
  react: ReactElement
}) {
  if (env.EMAIL_TRANSPORT === "resend") {
    if (!resend) {
      throw new Error(
        "RESEND_API_KEY must be configured when EMAIL_TRANSPORT=resend",
      )
    }

    const result = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      react: input.react,
    })

    if (result.error) {
      throw new Error(`Email delivery failed: ${result.error.message}`)
    }

    return result.data
  }

  return smtp.sendMail({
    from: env.EMAIL_FROM,
    to: input.to,
    subject: input.subject,
    html: await render(input.react),
    text: await render(input.react, { plainText: true }),
  })
}

export { ResetPasswordEmail, SignUpEmail }
