"use client"

import { usePathname, useSearchParams } from "next/navigation"
import posthog from "posthog-js"
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react"
import { Suspense, useEffect } from "react"
import { env } from "~/env"
import { useUser } from "~/stores/auth.store"
import type { ProviderProps } from "~/utils/types"

const analyticsEnabled =
  env.NEXT_PUBLIC_POSTHOG_KEY.trim().length > 0 &&
  env.NEXT_PUBLIC_POSTHOG_KEY !== "disabled"

export const PostHogProvider = ({ children }: ProviderProps) => {
  useEffect(() => {
    if (!analyticsEnabled) return
    posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: "/ingest",
      ui_host: "https://us.posthog.com",
    })
  }, [])

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  )
}

const PostHogPageView = () => {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const posthog = usePostHog()
  const user = useUser()

  useEffect(() => {
    if (!analyticsEnabled || !pathname || !posthog) return

    const search = searchParams.toString()
    const url = `${window.origin}${pathname}${search ? `?${search}` : ""}`

    posthog.capture("$pageview", { $current_url: url })
  }, [pathname, searchParams, posthog])

  useEffect(() => {
    if (!analyticsEnabled || !user || !posthog) return

    posthog.identify(user.id)
  }, [user, posthog])

  return null
}
