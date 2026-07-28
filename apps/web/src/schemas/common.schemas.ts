import { isAllowedEmailDomain } from "@taiyomoe/utils"
import { z } from "zod"
import { zodMessages } from "~/utils/zod-messages"

export const emailSchema = z
  .string()
  .nonempty(zodMessages.email.required)
  .email(zodMessages.email.invalid)
  .max(100, zodMessages.email.max100Characters)
  .refine(isAllowedEmailDomain, zodMessages.email.unsupportedProvider)

export const passwordSchema = z
  .string()
  .min(8, zodMessages.password.min8Character)
  .max(50, zodMessages.password.max50Characters)
  .regex(/[0-9]/, zodMessages.password.atLeast1Number)
  .regex(/[A-Z]/, zodMessages.password.atLeast1Uppercase)
  .regex(
    /[!@#$%^&*(),.?":{}|<>]/,
    zodMessages.password.atLeast1SpecialCharacter,
  )
