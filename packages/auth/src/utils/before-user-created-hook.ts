import {
  isAllowedEmailDomain,
  normalizeDisplayName,
  normalizeUsername,
} from "@taiyomoe/utils"
import type { User } from "better-auth"
import { APIError } from "better-auth/api"

export const beforeUserCreatedHook = async (user: User) => {
  if (!user.email || !isAllowedEmailDomain(user.email)) {
    throw new APIError("BAD_REQUEST", {
      code: "UNSUPPORTED_EMAIL_PROVIDER",
      message: "Use a supported permanent email provider",
    })
  }

  const normalizedUsername = normalizeUsername(user.name)
  const normalizedDisplayName = normalizeDisplayName(user.name)

  return {
    data: {
      ...user,
      name: normalizedDisplayName,
      normalizedEmail: user.email.trim().toLowerCase(),
      username: normalizedUsername,
      displayUsername: normalizedDisplayName,
    },
  }
}
