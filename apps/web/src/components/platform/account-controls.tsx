"use client"

import { authClient } from "@taiyomoe/auth/client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { Locale } from "~/features/platform/domain"
import { paths } from "~/features/platform/paths"

const className =
  "inline-flex min-h-11 items-center rounded-md border border-nv-border px-3 font-semibold text-sm hover:bg-surface-raised"

export function AccountControls({
  authenticated,
  canManage,
  locale,
  nickname,
  mockRole,
  unreadNotifications = 0,
}: {
  authenticated: boolean
  canManage: boolean
  locale: Locale
  nickname: string
  mockRole?: string
  unreadNotifications?: number
}) {
  const router = useRouter()
  if (!authenticated) {
    return (
      <>
        <Link className={className} href={paths.profile(locale)}>
          👤 {locale === "tr" ? "Profil" : "Profile"} · {nickname}
        </Link>
        <Link className={className} href="/auth/sign-in">
          🔑 {locale === "tr" ? "Giriş" : "Sign in"}
        </Link>
      </>
    )
  }
  return (
    <>
      <Link className={className} href={paths.profile(locale)}>
        👤 {locale === "tr" ? "Profil" : "Profile"} · {nickname}
        {unreadNotifications > 0 ? (
          <>
            <span className="sr-only">
              {unreadNotifications}{" "}
              {locale === "tr" ? "okunmamış bildirim" : "unread notifications"}
            </span>
            <span
              aria-hidden="true"
              className="ml-2 inline-grid min-w-6 place-items-center rounded-full bg-nv-primary px-1.5 text-nv-primary-foreground text-xs"
            >
              {unreadNotifications > 99 ? "99+" : unreadNotifications}
            </span>
          </>
        ) : null}
      </Link>
      {canManage ? (
        <Link className={className} href="/admin">
          🛠️ {locale === "tr" ? "Yönetim" : "Admin"}
        </Link>
      ) : null}
      {!mockRole ? (
        <button
          className={className}
          onClick={async () => {
            await authClient.signOut()
            router.refresh()
          }}
          type="button"
        >
          🚪 {locale === "tr" ? "Çıkış" : "Sign out"}
        </button>
      ) : null}
    </>
  )
}
