import { db } from "@taiyomoe/db"
import { getSession } from "~/utils/get-session"

export async function currentActiveUser() {
  const session = await getSession()
  if (!session?.user) return null
  return db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, banned: true },
  })
}

export async function resolveRelease(input: {
  seriesSlug: string
  chapterNumber: string
  profileSlug: string
  targetLanguage: "tr" | "en"
}) {
  return db.chapterRelease.findFirst({
    where: {
      deletedAt: null,
      isActive: true,
      isPublic: true,
      targetLanguage: input.targetLanguage,
      translationProfile: { slug: input.profileSlug },
      chapter: {
        deletedAt: null,
        chapterNumber: input.chapterNumber,
        series: { deletedAt: null, slug: input.seriesSlug },
      },
    },
    include: {
      translationProfile: { select: { slug: true } },
      chapter: {
        include: {
          series: {
            include: {
              localizations: {
                where: { locale: { in: ["tr", "en"] } },
              },
            },
          },
        },
      },
    },
  })
}
