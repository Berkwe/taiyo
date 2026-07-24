import { auth } from "@taiyomoe/auth/server"
import { headers } from "next/headers"
import { cache } from "react"

export const getSession = cache(async () => {
  const requestHeaders = await headers()
  const cookie = requestHeaders.get("cookie")
  if (!cookie?.includes("better-auth")) return null
  return auth.api.getSession({ headers: requestHeaders })
})
