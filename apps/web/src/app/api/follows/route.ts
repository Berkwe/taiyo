import { db } from "@taiyomoe/db"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { currentActiveUser } from "~/features/reading/server"
import { rejectCrossOriginWrite } from "~/utils/api-security"

const inputSchema = z.object({ seriesSlug: z.string().trim().min(1).max(180) })

export async function GET(request: NextRequest) {
  const user = await currentActiveUser()
  if (!user || user.banned) {
    return NextResponse.json({ authenticated: false, following: false })
  }
  const requestedSlug = request.nextUrl.searchParams.get("seriesSlug")
  if (!requestedSlug) {
    const entries = await db.seriesFollow.findMany({
      where: { userId: user.id, series: { deletedAt: null } },
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: {
        series: {
          include: {
            localizations: { where: { locale: { in: ["tr", "en"] } } },
            chapters: {
              where: { deletedAt: null },
              orderBy: { sortKey: "desc" },
              take: 1,
              include: {
                releases: {
                  where: { deletedAt: null, isPublic: true },
                  orderBy: { publishedAt: "desc" },
                  take: 1,
                  include: {
                    translationProfile: { select: { slug: true } },
                  },
                },
              },
            },
          },
        },
      },
    })
    return NextResponse.json({
      authenticated: true,
      entries: entries.map((entry) => {
        const chapter = entry.series.chapters[0]
        const release = chapter?.releases[0]
        return {
          seriesSlug: entry.series.slug,
          titles: Object.fromEntries(
            entry.series.localizations.map((item) => [item.locale, item.title]),
          ),
          followedAt: entry.createdAt,
          hasUnread:
            Boolean(release?.publishedAt) &&
            (!entry.lastSeenReleaseAt ||
              release!.publishedAt! > entry.lastSeenReleaseAt),
          latest:
            chapter && release
              ? {
                  chapterNumber: chapter.chapterNumber,
                  releaseId: release.id,
                  targetLanguage: release.targetLanguage,
                  profileSlug: release.translationProfile.slug,
                }
              : null,
        }
      }),
    })
  }
  const parsed = inputSchema.safeParse({ seriesSlug: requestedSlug })
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz seri." }, { status: 400 })
  }
  const follow = await db.seriesFollow.findFirst({
    where: {
      userId: user.id,
      series: { slug: parsed.data.seriesSlug, deletedAt: null },
    },
    select: { id: true },
  })
  if (follow) {
    await db.seriesFollow.update({
      where: { id: follow.id },
      data: { lastSeenReleaseAt: new Date() },
    })
  }
  return NextResponse.json({
    authenticated: true,
    following: Boolean(follow),
  })
}

export async function POST(request: NextRequest) {
  const rejected = rejectCrossOriginWrite(request)
  if (rejected) return rejected
  const user = await currentActiveUser()
  if (!user || user.banned) {
    return NextResponse.json({ error: "Giriş yapmalısınız." }, { status: 401 })
  }
  const parsed = inputSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz seri." }, { status: 400 })
  }
  const series = await db.series.findUnique({
    where: {
      slug: parsed.data.seriesSlug,
      deletedAt: null,
      isSearchable: true,
    },
    select: { id: true },
  })
  if (!series)
    return NextResponse.json({ error: "Seri bulunamadı." }, { status: 404 })
  await db.seriesFollow.upsert({
    where: { userId_seriesId: { userId: user.id, seriesId: series.id } },
    create: { userId: user.id, seriesId: series.id },
    update: {},
  })
  return NextResponse.json({ following: true })
}

export async function DELETE(request: NextRequest) {
  const rejected = rejectCrossOriginWrite(request)
  if (rejected) return rejected
  const user = await currentActiveUser()
  if (!user || user.banned) {
    return NextResponse.json({ error: "Giriş yapmalısınız." }, { status: 401 })
  }
  const parsed = inputSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz seri." }, { status: 400 })
  }
  await db.seriesFollow.deleteMany({
    where: {
      userId: user.id,
      series: { slug: parsed.data.seriesSlug },
    },
  })
  return NextResponse.json({ following: false })
}
