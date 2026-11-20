import { db } from "@taiyomoe/db"
import { BookOpen, House, Info, Languages, ShoppingBag } from "lucide-react"
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
import { MobileNavMenu } from "./mobile-nav-menu"

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
            src="/assets/brand/novora-wordmark-light-transparent.png"
            width={2176}
          />
          <Image
            alt="Novora"
            className="hidden h-auto w-full max-w-56 object-contain object-left sm:max-w-72 lg:max-w-80 dark:block"
            height={700}
            priority
            src="/assets/brand/novora-wordmark-dark-transparent.png"
            width={2176}
          />
        </Link>
        <nav
          aria-label={locale === "tr" ? "Ana navigasyon" : "Main navigation"}
          className="ml-4 hidden items-center gap-1 lg:flex"
        >
          <Link
            className="inline-flex items-center gap-2 rounded px-3 py-2 hover:bg-surface-raised"
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
            className="inline-flex items-center gap-2 rounded px-3 py-2 hover:bg-surface-raised"
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
            className="inline-flex items-center gap-2 rounded px-3 py-2 hover:bg-surface-raised"
            href={paths.translate(locale)}
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
            className="inline-flex items-center gap-2 rounded px-3 py-2 hover:bg-surface-raised"
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
            canManage={
              effectiveRole
                ? hasPermission(effectiveRole, "series:write")
                : false
            }
            nickname={nickname}
            mockRole={previewRole ?? undefined}
            unreadNotifications={unreadNotifications}
            locale={locale}
            monochromeIcons
          />
          <Link
            className="inline-flex items-center gap-2 rounded px-3 py-2 hover:bg-surface-raised"
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
        <div className="ml-auto flex items-center gap-2">
          <HeaderSearch locale={locale} />
          <MobileNavMenu
            authenticated={authenticated}
            canManage={
              effectiveRole
                ? hasPermission(effectiveRole, "series:write")
                : false
            }
            locale={locale}
            nickname={nickname}
            mockRole={previewRole ?? undefined}
            unreadNotifications={unreadNotifications}
          />
        </div>
      </div>
    </header>
  )
}
