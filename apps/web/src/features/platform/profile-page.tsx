import { db } from "@taiyomoe/db"
import type { Metadata } from "next"
import { FollowedSeries } from "~/components/platform/followed-series"
import { NotificationCenter } from "~/components/platform/notification-center"
import { ProfileOverview } from "~/components/platform/profile-overview"
import { ProfileSettings } from "~/components/platform/profile-settings"
import { ReadingHistory } from "~/components/platform/reading-history"
import { debugAccounts } from "~/features/debug/config"
import { getDebugViewerRole } from "~/features/debug/viewer"
import { getSession } from "~/utils/get-session"
import type { Locale } from "./domain"
import { paths } from "./paths"
import { localeAlternates, pageMetadata } from "./seo"

export function profileMetadata(locale: Locale): Metadata {
  return pageMetadata({
    title: locale === "tr" ? "Okuma geçmişim" : "My reading history",
    description:
      locale === "tr"
        ? "Kaldığınız bölümlere ve okuma geçmişinize dönün."
        : "Return to your chapters and reading history.",
    canonical: paths.profile(locale),
    alternates: localeAlternates(paths.profile("tr"), paths.profile("en")),
    locale,
    noIndex: true,
  })
}

export async function ProfilePage({ locale }: { locale: Locale }) {
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
      {realUser?.email || previewRole ? (
        <ProfileSettings
          about={profile?.about}
          city={profile?.city}
          email={
            realUser?.email ?? `${previewRole?.toLowerCase()}@novora.local`
          }
          locale={locale}
          name={name}
          preview={Boolean(previewRole)}
        />
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
      <NotificationCenter locale={locale} preview={Boolean(previewRole)} />
    </main>
  )
}
