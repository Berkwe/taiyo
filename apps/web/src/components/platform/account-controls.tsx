"use client"

import { authClient } from "@taiyomoe/auth/client"
import { LogIn, LogOut, UserRound, Wrench } from "lucide-react"
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
  monochromeIcons = false,
  unreadNotifications = 0,
}: {
  authenticated: boolean
  canManage: boolean
  locale: Locale
  nickname: string
  mockRole?: string
  monochromeIcons?: boolean
  unreadNotifications?: number
}) {
  const router = useRouter()
  if (!authenticated) {
    return (
      <>
        <Link className={className} href={paths.profile(locale)}>
          {monochromeIcons ? (
            <UserRound
              aria-hidden="true"
              className="mr-2 text-nv-muted-foreground"
              size={17}
              strokeWidth={1.8}
            />
          ) : (
            "👤 "
          )}
          {locale === "tr" ? "Profil" : "Profile"} · {nickname}
        </Link>
        <Link className={className} href="/auth/sign-in">
          {monochromeIcons ? (
            <LogIn
              aria-hidden="true"
              className="mr-2 text-nv-muted-foreground"
              size={17}
              strokeWidth={1.8}
            />
          ) : (
            "🔑 "
          )}
          {locale === "tr" ? "Giriş" : "Sign in"}
        </Link>
      </>
    )
  }
  return (
    <>
      <Link className={className} href={paths.profile(locale)}>
        {monochromeIcons ? (
          <UserRound
            aria-hidden="true"
            className="mr-2 text-nv-muted-foreground"
            size={17}
            strokeWidth={1.8}
          />
        ) : (
          "👤 "
        )}
        {locale === "tr" ? "Profil" : "Profile"} · {nickname}
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
          {monochromeIcons ? (
            <Wrench
              aria-hidden="true"
              className="mr-2 text-nv-muted-foreground"
              size={17}
              strokeWidth={1.8}
            />
          ) : (
            "🛠️ "
          )}
          {locale === "tr" ? "Yönetim" : "Admin"}
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
          {monochromeIcons ? (
            <LogOut
              aria-hidden="true"
              className="mr-2 text-nv-muted-foreground"
              size={17}
              strokeWidth={1.8}
            />
          ) : (
            "🚪 "
          )}
          {locale === "tr" ? "Çıkış" : "Sign out"}
        </button>
      ) : null}
    </>
  )
}
