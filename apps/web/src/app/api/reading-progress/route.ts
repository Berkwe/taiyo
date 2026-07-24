import { db } from "@taiyomoe/db"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { currentActiveUser, resolveRelease } from "~/features/reading/server"
import { rejectCrossOriginWrite } from "~/utils/api-security"

export const runtime = "nodejs"

const inputSchema = z.object({
  seriesSlug: z.string().trim().min(1).max(180),
  chapterNumber: z.string().trim().min(1).max(30),
  profileSlug: z.string().trim().min(1).max(100),
  targetLanguage: z.enum(["tr", "en"]),
  pageNumber: z.number().int().min(1).max(10_000),
  scrollRatio: z.number().min(0).max(1),
  completed: z.boolean(),
})

export async function POST(request: NextRequest) {
  const rejected = rejectCrossOriginWrite(request)
  if (rejected) return rejected
  const user = await currentActiveUser()
  if (!user || user.banned) return new NextResponse(null, { status: 204 })
  const parsed = inputSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Geçersiz ilerleme verisi." },
      { status: 400 },
    )
  }
  const release = await resolveRelease(parsed.data)
  if (!release)
    return NextResponse.json({ error: "Sürüm bulunamadı." }, { status: 404 })
  await db.readingProgressRecord.upsert({
    where: { userId_releaseId: { userId: user.id, releaseId: release.id } },
    create: {
      userId: user.id,
      releaseId: release.id,
      chapterId: release.chapterId,
      pageNumber: parsed.data.pageNumber,
      scrollRatio: parsed.data.scrollRatio,
      completedAt: parsed.data.completed ? new Date() : null,
    },
    update: {
      chapterId: release.chapterId,
      pageNumber: parsed.data.pageNumber,
      scrollRatio: parsed.data.scrollRatio,
      ...(parsed.data.completed ? { completedAt: new Date() } : {}),
    },
  })
  return new NextResponse(null, { status: 204 })
}

export async function GET() {
  const user = await currentActiveUser()
  if (!user || user.banned)
    return NextResponse.json({ authenticated: false, entries: [] })
  const entries = await db.readingProgressRecord.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: {
      release: {
        include: {
          translationProfile: { select: { slug: true } },
          chapter: {
            include: {
              localizations: { where: { locale: { in: ["tr", "en"] } } },
              series: {
                include: {
                  localizations: { where: { locale: { in: ["tr", "en"] } } },
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
    entries: entries.map((entry) => ({
      releaseId: entry.releaseId,
      seriesSlug: entry.release.chapter.series.slug,
      seriesTitles: Object.fromEntries(
        entry.release.chapter.series.localizations.map((item) => [
          item.locale,
          item.title,
        ]),
      ),
      chapterId: entry.chapterId,
      chapterNumber: entry.release.chapter.chapterNumber,
      chapterTitles: Object.fromEntries(
        entry.release.chapter.localizations.map((item) => [
          item.locale,
          item.title,
        ]),
      ),
      profileSlug: entry.release.translationProfile.slug,
      targetLanguage: entry.release.targetLanguage,
      pageNumber: entry.pageNumber,
      scrollRatio: entry.scrollRatio,
      updatedAt: entry.updatedAt,
      completedAt: entry.completedAt,
    })),
  })
}
