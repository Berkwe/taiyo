"use client"

import { authClient } from "@taiyomoe/auth/client"
import { Bug, Check, LogIn, RefreshCw, Trash2, Users } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import {
  type DebugViewerRole,
  debugAccounts,
  debugViewerCookie,
} from "~/features/debug/config"
import type { Locale } from "~/features/platform/domain"

type DeviceSession = {
  session: {
    token: string
    userId: string
  }
  user: {
    id: string
    email: string
    name: string
    image?: string | null
  }
}

const roles = Object.keys(debugAccounts) as DebugViewerRole[]

function clearDebugRole() {
  document.cookie = `${debugViewerCookie}=; Path=/; Max-Age=0; SameSite=Lax`
}

export function ProfileAccountSwitcher({
  currentUserId,
  debugEnabled,
  initialDebugRole,
  locale,
}: {
  currentUserId: string | null
  debugEnabled: boolean
  initialDebugRole: DebugViewerRole | null
  locale: Locale
}) {
  const tr = locale === "tr"
  const [sessions, setSessions] = useState<DeviceSession[]>([])
  const [loading, setLoading] = useState(true)
  const [busyToken, setBusyToken] = useState<string | null>(null)
  const [status, setStatus] = useState("")

  const loadSessions = useCallback(async () => {
    setLoading(true)
    const result = await authClient.multiSession.listDeviceSessions()
    setSessions((result.data ?? []) as DeviceSession[])
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadSessions()
  }, [loadSessions])

  const activate = async (deviceSession: DeviceSession) => {
    setBusyToken(deviceSession.session.token)
    setStatus("")
    const result = await authClient.multiSession.setActive({
      sessionToken: deviceSession.session.token,
    })
    if (result.error) {
      setStatus(
        tr
          ? "Hesap değiştirilemedi. Lütfen yeniden giriş yap."
          : "Could not switch accounts. Please sign in again.",
      )
      setBusyToken(null)
      return
    }

    clearDebugRole()
    window.location.reload()
  }

  const remove = async (deviceSession: DeviceSession) => {
    setBusyToken(deviceSession.session.token)
    setStatus("")
    const result = await authClient.multiSession.revoke({
      sessionToken: deviceSession.session.token,
    })
    if (result.error) {
      setStatus(
        tr
          ? "Kayıtlı hesap kaldırılamadı."
          : "The saved account could not be removed.",
      )
      setBusyToken(null)
      return
    }

    await loadSessions()
    setBusyToken(null)
    setStatus(tr ? "Hesap bu cihazdan kaldırıldı." : "Account removed.")
  }

  return (
    <section className="mb-8 border border-nv-border bg-surface p-5">
      <h2 className="flex items-center gap-2 font-bold text-xl">
        <Users aria-hidden="true" size={21} />
        {tr ? "Hesaplar" : "Accounts"}
      </h2>
      <p className="mt-2 text-nv-muted-foreground text-sm">
        {tr
          ? "Bu cihazda giriş yaptığın hesaplar arasında parola girmeden geçiş yap."
          : "Switch between accounts signed in on this device without entering a password again."}
      </p>

      <div className="mt-4 grid gap-2">
        {loading ? (
          <p className="flex items-center gap-2 text-nv-muted-foreground text-sm">
            <RefreshCw aria-hidden="true" className="animate-spin" size={16} />
            {tr ? "Hesaplar yükleniyor…" : "Loading accounts…"}
          </p>
        ) : null}
        {!loading && sessions.length === 0 ? (
          <p className="text-nv-muted-foreground text-sm">
            {tr
              ? "Bu cihazda kayıtlı gerçek bir oturum yok."
              : "There is no saved account session on this device."}
          </p>
        ) : null}
        {sessions.map((deviceSession) => {
          const active =
            !initialDebugRole && deviceSession.user.id === currentUserId
          const busy = busyToken === deviceSession.session.token

          return (
            <div
              className="flex flex-wrap items-center gap-3 border border-nv-border p-3"
              key={deviceSession.session.token}
            >
              <div className="min-w-0 flex-1">
                <strong className="block truncate">
                  {deviceSession.user.name}
                </strong>
                <span className="block truncate text-nv-muted-foreground text-sm">
                  {deviceSession.user.email}
                </span>
              </div>
              {active ? (
                <span className="inline-flex min-h-9 items-center gap-2 px-3 font-semibold text-sm">
                  <Check aria-hidden="true" size={16} />
                  {tr ? "Etkin" : "Active"}
                </span>
              ) : (
                <button
                  className="min-h-10 rounded-md bg-nv-primary px-4 font-semibold text-nv-primary-foreground"
                  disabled={Boolean(busyToken)}
                  onClick={() => void activate(deviceSession)}
                  type="button"
                >
                  {busy
                    ? tr
                      ? "Geçiliyor…"
                      : "Switching…"
                    : tr
                      ? "Bu hesaba geç"
                      : "Switch"}
                </button>
              )}
              {!active ? (
                <button
                  aria-label={
                    tr
                      ? `${deviceSession.user.name} hesabını bu cihazdan kaldır`
                      : `Remove ${deviceSession.user.name} from this device`
                  }
                  className="inline-flex size-10 items-center justify-center rounded-md border border-nv-border"
                  disabled={Boolean(busyToken)}
                  onClick={() => void remove(deviceSession)}
                  title={tr ? "Bu cihazdan kaldır" : "Remove from device"}
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={17} />
                </button>
              ) : null}
            </div>
          )
        })}
      </div>

      <a
        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md border border-nv-border px-4 font-semibold"
        href="/auth/sign-in?add=1"
      >
        <LogIn aria-hidden="true" size={18} />
        {tr ? "Başka hesap ekle" : "Add another account"}
      </a>

      {debugEnabled ? (
        <div className="mt-6 border-nv-border border-t pt-5">
          <h3 className="flex items-center gap-2 font-bold">
            <Bug aria-hidden="true" size={18} />
            {tr ? "Debug görünümü" : "Debug view"}
          </h3>
          <p className="mt-2 text-nv-muted-foreground text-sm">
            {tr
              ? "Yalnız geliştirme ortamında mock rol görünümünü değiştirir."
              : "Changes the mock role preview in development only."}
          </p>
          <label className="mt-3 grid max-w-md gap-2 text-sm">
            {tr ? "Görüntülenecek hesap" : "Account to preview"}
            <select
              aria-label={tr ? "Debug hesabı" : "Debug account"}
              className="min-h-11 border border-nv-border bg-background px-3"
              value={initialDebugRole ?? ""}
              onChange={(event) => {
                if (!event.target.value) {
                  clearDebugRole()
                } else {
                  document.cookie = `${debugViewerCookie}=${event.target.value}; Path=/; Max-Age=604800; SameSite=Lax`
                }
                window.location.reload()
              }}
            >
              <option value="">
                {tr ? "Gerçek oturumu kullan" : "Use real session"}
              </option>
              {roles.map((role) => (
                <option value={role} key={role}>
                  {role} · {debugAccounts[role].name}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      <p aria-live="polite" className="mt-3 text-nv-muted-foreground text-sm">
        {status}
      </p>
    </section>
  )
}
