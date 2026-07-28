"use client"

import { Settings, UserRound } from "lucide-react"
import type { ReactNode } from "react"
import type { Locale } from "~/features/platform/domain"

export function ProfileTabs({
  active,
  locale,
  profile,
  settings,
}: {
  active: "profile" | "settings"
  locale: Locale
  profile: ReactNode
  settings: ReactNode
}) {
  const tr = locale === "tr"

  return (
    <>
      <nav
        aria-label={tr ? "Profil bölümleri" : "Profile sections"}
        className="mb-8 grid grid-cols-2 border border-nv-border bg-surface p-1"
      >
        <a
          aria-current={active === "profile" ? "page" : undefined}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 font-semibold aria-[current=page]:bg-nv-primary aria-[current=page]:text-nv-primary-foreground"
          href="?tab=profile"
        >
          <UserRound aria-hidden="true" size={18} />
          {tr ? "Profil" : "Profile"}
        </a>
        <a
          aria-current={active === "settings" ? "page" : undefined}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 font-semibold aria-[current=page]:bg-nv-primary aria-[current=page]:text-nv-primary-foreground"
          href="?tab=settings"
        >
          <Settings aria-hidden="true" size={18} />
          {tr ? "Ayarlar" : "Settings"}
        </a>
      </nav>
      {active === "profile" ? profile : settings}
    </>
  )
}
