"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import type { Locale } from "~/features/platform/domain"

interface NotificationEntry {
  id: string
  title: string
  message: string
  href: string | null
  readAt: string | null
  createdAt: string
}

const preferenceKeys = [
  "followedSeriesUpdates",
  "reportStatusUpdates",
  "accountUpdates",
] as const
type Preferences = Record<(typeof preferenceKeys)[number], boolean>

const defaultPreferences: Preferences = {
  followedSeriesUpdates: true,
  reportStatusUpdates: true,
  accountUpdates: true,
}

export function NotificationCenter({
  locale,
  preview = false,
}: {
  locale: Locale
  preview?: boolean
}) {
  const [entries, setEntries] = useState<NotificationEntry[]>([])
  const [unread, setUnread] = useState(0)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState("")
  const [preferences, setPreferences] = useState<Preferences | null>(
    preview ? defaultPreferences : null,
  )

  useEffect(() => {
    if (preview) return
    void Promise.all([
      fetch("/api/notifications").then(
        async (response) =>
          (await response.json()) as {
            authenticated: boolean
            entries: NotificationEntry[]
            unreadCount: number
            nextCursor: string | null
          },
      ),
      fetch("/api/notifications/preferences").then(
        async (response) =>
          (await response.json()) as {
            authenticated: boolean
            preferences: Preferences
          },
      ),
    ]).then(([notifications, settings]) => {
      if (notifications.authenticated) {
        setEntries(notifications.entries)
        setUnread(notifications.unreadCount)
        setNextCursor(notifications.nextCursor)
      }
      if (settings.authenticated) setPreferences(settings.preferences)
    })
  }, [preview])
  if (!preferences) return null

  async function markRead(id?: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { id } : { all: true }),
    })
    const now = new Date().toISOString()
    setEntries((current) =>
      current.map((item) =>
        !id || item.id === id ? { ...item, readAt: item.readAt ?? now } : item,
      ),
    )
    setUnread((current) => (id ? Math.max(0, current - 1) : 0))
  }

  async function loadMore() {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    setLoadError("")
    try {
      const response = await fetch(
        `/api/notifications?cursor=${encodeURIComponent(nextCursor)}`,
      )
      if (!response.ok) throw new Error("notifications")
      const result = (await response.json()) as {
        authenticated: boolean
        entries: NotificationEntry[]
        nextCursor: string | null
      }
      if (!result.authenticated) return
      setEntries((current) => {
        const ids = new Set(current.map((entry) => entry.id))
        return [
          ...current,
          ...result.entries.filter((entry) => !ids.has(entry.id)),
        ]
      })
      setNextCursor(result.nextCursor)
    } catch {
      setLoadError(
        locale === "tr"
          ? "Bildirimlerin devamı yüklenemedi."
          : "More notifications could not be loaded.",
      )
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold text-3xl">
          {locale === "tr" ? "Bildirimler" : "Notifications"}
          {unread ? ` (${unread})` : ""}
        </h2>
        {unread ? (
          <button
            className="min-h-11 border border-nv-border px-4 font-semibold"
            onClick={() => void markRead()}
            type="button"
          >
            {locale === "tr" ? "Tümünü okundu yap" : "Mark all read"}
          </button>
        ) : null}
      </div>
      <div className="mt-5 grid gap-3">
        {entries.length ? (
          entries.map((entry) => (
            <article
              className={`border border-nv-border p-4 ${entry.readAt ? "bg-surface" : "bg-nv-primary-soft"}`}
              key={entry.id}
            >
              <h3 className="font-bold">{entry.title}</h3>
              <p className="mt-1 text-nv-muted-foreground text-sm">
                {entry.message}
              </p>
              <div className="mt-3 flex gap-3 text-sm">
                {entry.href ? (
                  <Link
                    className="font-semibold text-nv-primary"
                    href={entry.href}
                    onClick={() => !entry.readAt && void markRead(entry.id)}
                  >
                    {locale === "tr" ? "İlgili sayfaya git" : "Open"}
                  </Link>
                ) : null}
                {!entry.readAt ? (
                  <button
                    className="font-semibold"
                    onClick={() => void markRead(entry.id)}
                    type="button"
                  >
                    {locale === "tr" ? "Okundu" : "Mark read"}
                  </button>
                ) : null}
              </div>
            </article>
          ))
        ) : (
          <p className="border border-nv-border border-dashed p-6 text-nv-muted-foreground">
            {locale === "tr" ? "Henüz bildirim yok." : "No notifications yet."}
          </p>
        )}
      </div>
      {nextCursor ? (
        <button
          className="mt-4 min-h-11 w-full border border-nv-border px-4 font-semibold hover:bg-surface-raised"
          disabled={loadingMore}
          onClick={() => void loadMore()}
          type="button"
        >
          {loadingMore
            ? locale === "tr"
              ? "Yükleniyor…"
              : "Loading…"
            : locale === "tr"
              ? "Daha fazla bildirim"
              : "Load more notifications"}
        </button>
      ) : null}
      {loadError ? (
        <p aria-live="polite" className="mt-2 text-danger text-sm">
          {loadError}
        </p>
      ) : null}
      <fieldset className="mt-6 grid gap-3 border border-nv-border p-4">
        <legend className="px-2 font-bold">
          {locale === "tr" ? "Bildirim tercihleri" : "Notification settings"}
        </legend>
        {preferenceKeys.map((key) => {
          const labels = {
            followedSeriesUpdates:
              locale === "tr"
                ? "Takip edilen seriye yeni bölüm"
                : "New followed-series chapters",
            reportStatusUpdates:
              locale === "tr" ? "Rapor durumu" : "Report status",
            accountUpdates:
              locale === "tr"
                ? "Hesap ve rol değişiklikleri"
                : "Account updates",
          }
          return (
            <label className="flex items-center gap-3" key={key}>
              <input
                checked={preferences[key]}
                onChange={async (event) => {
                  const next = { ...preferences, [key]: event.target.checked }
                  setPreferences(next)
                  if (preview) return
                  await fetch("/api/notifications/preferences", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(next),
                  })
                }}
                type="checkbox"
              />
              {labels[key]}
            </label>
          )
        })}
      </fieldset>
    </section>
  )
}
