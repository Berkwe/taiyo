"use client"

import { Bell, BellOff } from "lucide-react"
import { useEffect, useState } from "react"
import type { Locale } from "~/features/platform/domain"

export function FollowSeriesButton({
  followLabel,
  locale,
  seriesSlug,
  unfollowLabel,
}: {
  followLabel?: string
  locale: Locale
  seriesSlug: string
  unfollowLabel?: string
}) {
  const [following, setFollowing] = useState(false)
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    void fetch(`/api/follows?seriesSlug=${encodeURIComponent(seriesSlug)}`)
      .then(
        async (response) =>
          (await response.json()) as {
            authenticated: boolean
            following: boolean
          },
      )
      .then((result) => {
        setAuthenticated(result.authenticated)
        setFollowing(result.following)
      })
      .catch(() => setAuthenticated(false))
  }, [seriesSlug])

  return (
    <div className="mt-5">
      <button
        className="inline-flex min-h-11 items-center gap-2 border border-nv-border bg-surface px-4 font-semibold hover:bg-surface-raised disabled:opacity-60"
        disabled={busy || authenticated === null}
        onClick={async () => {
          if (!authenticated) {
            window.location.assign("/auth/sign-in")
            return
          }
          setBusy(true)
          const response = await fetch("/api/follows", {
            method: following ? "DELETE" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ seriesSlug }),
          })
          setBusy(false)
          if (!response.ok) {
            setMessage(
              locale === "tr" ? "İşlem tamamlanamadı." : "Could not update.",
            )
            return
          }
          setFollowing(!following)
          setMessage(
            locale === "tr"
              ? following
                ? "Seri takibi bırakıldı."
                : "Seri takip edildi."
              : following
                ? "Series unfollowed."
                : "Series followed.",
          )
        }}
        type="button"
      >
        {following ? <BellOff size={18} /> : <Bell size={18} />}
        {locale === "tr"
          ? following
            ? (unfollowLabel ?? "Takibi bırak")
            : (followLabel ?? "Seriyi takip et")
          : following
            ? (unfollowLabel ?? "Unfollow")
            : (followLabel ?? "Follow series")}
      </button>
      {message ? (
        <p aria-live="polite" className="mt-2 text-nv-muted-foreground text-sm">
          {message}
        </p>
      ) : null}
    </div>
  )
}
