import { db } from "@taiyomoe/db"
import { Menu } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { getDebugViewerRole } from "~/features/debug/viewer"
import { hasPermission } from "~/features/management/permissions"
import { copy } from "~/features/platform/copy"
import type { Locale } from "~/features/platform/domain"
import { paths } from "~/features/platform/paths"
import { getSession } from "~/utils/get-session"
import { AccountControls } from "./account-controls"
import { HeaderSearch } from "./header-search"

export async function AppHeader({ locale }: { locale: Locale }) {
  const t = copy[locale]
  const session = await getSession()
  const debugRole = await getDebugViewerRole()
  const previewRole = debugRole && debugRole !== "GUEST" ? debugRole : null
  const authenticated =
    debugRole !== null ? debugRole !== "GUEST" : Boolean(session?.user)
  const effectiveRole =
    debugRole !== null ? (previewRole ?? undefined) : session?.user?.role
  const guestLabel = locale === "tr" ? "Misafir" : "Guest"
  const nickname =
    debugRole === "GUEST"
      ? guestLabel
      : previewRole
        ? `@debug_${previewRole.toLowerCase()}`
        : session?.user?.username
          ? `@${session.user.username}`
          : guestLabel
  const unreadNotifications =
    authenticated && debugRole === null && session?.user
      ? await db.siteNotification.count({
          where: { userId: session.user.id, readAt: null },
        })
      : 0
  return (
    <header className="site-header sticky top-0 z-50 border-nv-border border-b bg-background/95 backdrop-blur transition-transform duration-150">
      <div className="flex min-h-20 items-center gap-4 pr-4 pl-2 sm:pr-6 sm:pl-3 lg:pr-8">
        <Link
          aria-label="NovoraScans ana sayfa"
          className="flex min-w-0 flex-1 items-center md:flex-none"
          href={paths.home(locale)}
        >
          <Image
            alt="Novora"
            className="h-auto w-full max-w-56 object-contain object-left sm:max-w-72 lg:max-w-80 dark:hidden"
            height={700}
            priority
            src="/novora-header-light.png"
            width={2176}
          />
          <Image
            alt="Novora"
            className="hidden h-auto w-full max-w-56 object-contain object-left sm:max-w-72 lg:max-w-80 dark:block"
            height={700}
            priority
            src="/novora-header-dark.png"
            width={2176}
          />
        </Link>
        <nav
          aria-label={locale === "tr" ? "Ana navigasyon" : "Main navigation"}
          className="ml-4 hidden items-center gap-1 lg:flex"
        >
          <Link
            className="rounded px-3 py-2 hover:bg-surface-raised"
            href={paths.home(locale)}
          >
            🏠 {t.nav.home}
          </Link>
          <Link
            className="rounded px-3 py-2 hover:bg-surface-raised"
            href={paths.discover(locale)}
          >
            📚 {t.nav.discover}
          </Link>
          <Link
            className="rounded px-3 py-2 hover:bg-surface-raised"
            href={paths.market(locale)}
          >
            🛍️ {t.nav.market}
          </Link>
          <AccountControls
            authenticated={authenticated}
            canManage={
              effectiveRole
                ? hasPermission(effectiveRole, "series:write")
                : false
            }
            nickname={nickname}
            mockRole={previewRole ?? undefined}
            unreadNotifications={unreadNotifications}
            locale={locale}
          />
          <Link
            className="rounded px-3 py-2 hover:bg-surface-raised"
            href={paths.about(locale)}
          >
            ℹ️ {t.nav.about}
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <HeaderSearch locale={locale} />
          <details className="relative lg:hidden">
            <summary
              aria-label={locale === "tr" ? "Menüyü aç" : "Open menu"}
              className="flex size-11 cursor-pointer list-none items-center justify-center rounded-md border border-nv-border font-semibold"
            >
              <Menu aria-hidden="true" size={20} />
            </summary>
            <nav className="absolute top-12 right-0 grid min-w-48 gap-1 border border-nv-border bg-surface p-2 shadow-xl">
              <Link
                className="px-3 py-3 hover:bg-surface-raised"
                href={paths.home(locale)}
              >
                🏠 {t.nav.home}
              </Link>
              <Link
                className="px-3 py-3 hover:bg-surface-raised"
                href={paths.discover(locale)}
              >
                📚 {t.nav.discover}
              </Link>
              <Link
                className="px-3 py-3 hover:bg-surface-raised"
                href={paths.market(locale)}
              >
                🛍️ {t.nav.market}
              </Link>
              <AccountControls
                authenticated={authenticated}
                canManage={
                  effectiveRole
                    ? hasPermission(effectiveRole, "series:write")
                    : false
                }
                nickname={nickname}
                mockRole={previewRole ?? undefined}
                unreadNotifications={unreadNotifications}
                locale={locale}
              />
              <Link
                className="px-3 py-3 hover:bg-surface-raised"
                href={paths.about(locale)}
              >
                ℹ️ {t.nav.about}
              </Link>
            </nav>
          </details>
        </div>
      </div>
    </header>
  )
}
