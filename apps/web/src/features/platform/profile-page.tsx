import { db } from "@taiyomoe/db"
import type { Metadata } from "next"
import { FollowedSeries } from "~/components/platform/followed-series"
import { NotificationCenter } from "~/components/platform/notification-center"
import { ProfileAccountSwitcher } from "~/components/platform/profile-account-switcher"
import { ProfileOverview } from "~/components/platform/profile-overview"
import { ProfilePreferences } from "~/components/platform/profile-preferences"
import { ProfileSettings } from "~/components/platform/profile-settings"
import { ProfileTabs } from "~/components/platform/profile-tabs"
import { ReadingHistory } from "~/components/platform/reading-history"
import { debugAccounts } from "~/features/debug/config"
import { getDebugViewerRole, isDebugMode } from "~/features/debug/viewer"
import { getSession } from "~/utils/get-session"
import type { Locale } from "./domain"
import { paths } from "./paths"
import { localeAlternates, pageMetadata } from "./seo"

export function profileMetadata(locale: Locale): Metadata {
  return pageMetadata({
    title: locale === "tr" ? "Profil ve ayarlar" : "Profile and settings",
    description:
      locale === "tr"
        ? "Hesabınızı, görünüm tercihlerinizi ve okuma geçmişinizi yönetin."
        : "Manage your account, appearance preferences and reading history.",
    canonical: paths.profile(locale),
    alternates: localeAlternates(paths.profile("tr"), paths.profile("en")),
    locale,
    noIndex: true,
  })
}

export async function ProfilePage({
  locale,
  tab = "profile",
}: {
  locale: Locale
  tab?: "profile" | "settings"
}) {
  const [session, debugRole] = await Promise.all([
    getSession(),
    getDebugViewerRole(),
  ])
  const previewRole = debugRole && debugRole !== "GUEST" ? debugRole : null
  const realUser = debugRole === null ? session?.user : null
  const name = previewRole
    ? debugAccounts[previewRole].name
    : realUser?.name || "Novora Misafiri"
  const role = previewRole ?? realUser?.role ?? "MİSAFİR"
  const authenticated = Boolean(previewRole || realUser)
  const profile = realUser
    ? await db.userProfile.findUnique({
        where: { userId: realUser.id },
        select: { about: true, city: true },
      })
    : null
  return (
    <main className="py-12 content-shell" id="main-content">
      <ProfileOverview
        authenticated={authenticated}
        avatar={realUser?.image}
        canUploadAvatar={Boolean(realUser)}
        email={realUser?.email}
        name={name}
        role={role}
      />
      <ProfileTabs
        active={tab}
        locale={locale}
        profile={
          <>
            <ProfileAccountSwitcher
              currentUserId={session?.user.id ?? null}
              debugEnabled={isDebugMode()}
              initialDebugRole={debugRole}
              locale={locale}
            />
            {realUser?.email || previewRole ? (
              <div id="profile-account-settings">
                <ProfileSettings
                  about={profile?.about}
                  city={profile?.city}
                  email={
                    realUser?.email ??
                    `${previewRole?.toLowerCase()}@novora.local`
                  }
                  locale={locale}
                  name={name}
                  preview={Boolean(previewRole)}
                />
              </div>
            ) : null}
            <h2 className="font-bold text-3xl">
              {locale === "tr" ? "Okuduklarım" : "My reading"}
            </h2>
            <p className="mt-3 mb-8 text-nv-muted-foreground">
              {locale === "tr"
                ? "Bu tarayıcıda okuduğun bölümler, tamamlananlar ve kaldığın konumlar. Giriş yaparsan cihazlar arasında da eşitlenir."
                : "Chapters read in this browser, completed entries and saved positions. Sign in to sync across devices."}
            </p>
            <ReadingHistory locale={locale} />
            <FollowedSeries locale={locale} />
            <NotificationCenter
              locale={locale}
              preview={Boolean(previewRole)}
            />
          </>
        }
        settings={
          <ProfilePreferences
            authenticated={Boolean(realUser || previewRole)}
            canPersist={Boolean(realUser)}
            initialTranslationLanguage="tr"
            locale={locale}
          />
        }
      />
    </main>
  )
}
