"use client"

import {
  BookOpen,
  House,
  Info,
  Languages,
  Menu,
  ShoppingBag,
  X,
} from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { copy } from "~/features/platform/copy"
import type { Locale } from "~/features/platform/domain"
import { paths } from "~/features/platform/paths"
import { useAnimatedPresence } from "~/hooks/use-animated-presence"
import { AccountControls } from "./account-controls"

export function MobileNavMenu({
  authenticated,
  canManage,
  locale,
  nickname,
  mockRole,
  unreadNotifications,
}: {
  authenticated: boolean
  canManage: boolean
  locale: Locale
  nickname: string
  mockRole?: string
  unreadNotifications: number
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const { motionState, rendered } = useAnimatedPresence(open)
  const t = copy[locale]

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("pointerdown", closeOutside)
    window.addEventListener("keydown", closeWithEscape)
    return () => {
      document.removeEventListener("pointerdown", closeOutside)
      window.removeEventListener("keydown", closeWithEscape)
    }
  }, [open])

  return (
    <div className="relative lg:hidden" ref={root}>
      <button
        aria-expanded={open}
        aria-label={locale === "tr" ? "Menüyü aç" : "Open menu"}
        className="flex size-11 cursor-pointer items-center justify-center rounded-md border border-nv-border font-semibold"
        data-nav-trigger
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {open ? (
          <X aria-hidden="true" size={20} />
        ) : (
          <Menu aria-hidden="true" size={20} />
        )}
      </button>
      {rendered ? (
        <nav
          aria-label={
            locale === "tr" ? "Mobil ana navigasyon" : "Mobile navigation"
          }
          className="absolute top-12 right-0 grid min-w-48 gap-1 border border-nv-border bg-surface p-2 shadow-xl"
          data-mobile-nav
          data-popup-motion={motionState}
          onClick={(event) => {
            if ((event.target as Element).closest("a,button")) setOpen(false)
          }}
          onKeyDown={(event) => {
            if (
              ["Enter", " "].includes(event.key) &&
              (event.target as Element).closest("a,button")
            )
              setOpen(false)
          }}
        >
          <Link
            className="flex items-center gap-2 px-3 py-3 hover:bg-surface-raised"
            href={paths.home(locale)}
          >
            <House
              aria-hidden="true"
              className="text-nv-muted-foreground"
              size={17}
              strokeWidth={1.8}
            />
            {t.nav.home}
          </Link>
          <Link
            className="flex items-center gap-2 px-3 py-3 hover:bg-surface-raised"
            href={paths.discover(locale)}
          >
            <BookOpen
              aria-hidden="true"
              className="text-nv-muted-foreground"
              size={17}
              strokeWidth={1.8}
            />
            {t.nav.discover}
          </Link>
          <Link
            className="flex items-center gap-2 px-3 py-3 hover:bg-surface-raised"
            href={paths.translate()}
          >
            <Languages
              aria-hidden="true"
              className="text-nv-muted-foreground"
              size={17}
              strokeWidth={1.8}
            />
            {t.nav.translate}
          </Link>
          <Link
            className="flex items-center gap-2 px-3 py-3 hover:bg-surface-raised"
            href={paths.market(locale)}
          >
            <ShoppingBag
              aria-hidden="true"
              className="text-nv-muted-foreground"
              size={17}
              strokeWidth={1.8}
            />
            {t.nav.market}
          </Link>
          <AccountControls
            authenticated={authenticated}
            canManage={canManage}
            nickname={nickname}
            mockRole={mockRole}
            unreadNotifications={unreadNotifications}
            locale={locale}
            monochromeIcons
          />
          <Link
            className="flex items-center gap-2 px-3 py-3 hover:bg-surface-raised"
            href={paths.about(locale)}
          >
            <Info
              aria-hidden="true"
              className="text-nv-muted-foreground"
              size={17}
              strokeWidth={1.8}
            />
            {t.nav.about}
          </Link>
        </nav>
      ) : null}
    </div>
  )
}
