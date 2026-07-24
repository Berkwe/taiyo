import { db } from "@taiyomoe/db"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { shouldReplaceProgress } from "~/features/reading/merge-progress"
import { currentActiveUser, resolveRelease } from "~/features/reading/server"
import { rejectCrossOriginWrite } from "~/utils/api-security"

export const runtime = "nodejs"

const entrySchema = z.object({
  key: z.string().min(1).max(300),
  seriesSlug: z.string().trim().min(1).max(180),
  chapterNumber: z.string().trim().min(1).max(30),
  profileSlug: z.string().trim().min(1).max(100),
  targetLanguage: z.enum(["tr", "en"]),
  pageNumber: z.number().int().min(1).max(10_000),
  scrollRatio: z.number().min(0).max(1),
  updatedAt: z.iso.datetime(),
  completedAt: z.iso.datetime().optional(),
})
const inputSchema = z.object({ entries: z.array(entrySchema).max(100) })

export async function POST(request: NextRequest) {
  const rejected = rejectCrossOriginWrite(request)
  if (rejected) return rejected
  const user = await currentActiveUser()
  if (!user || user.banned) {
    return NextResponse.json({ error: "Giriş yapmalısınız." }, { status: 401 })
  }
  const parsed = inputSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Geçersiz geçmiş verisi." },
      { status: 400 },
    )
  }

  const importedKeys: string[] = []
  for (const entry of parsed.data.entries) {
    const release = await resolveRelease(entry)
    if (!release) continue
    const incoming = {
      pageNumber: entry.pageNumber,
      scrollRatio: entry.scrollRatio,
      updatedAt: new Date(entry.updatedAt),
      completedAt: entry.completedAt ? new Date(entry.completedAt) : null,
    }
    await db.$transaction(async (tx) => {
      const current = await tx.readingProgressRecord.findUnique({
        where: {
          userId_releaseId: { userId: user.id, releaseId: release.id },
        },
      })
      if (shouldReplaceProgress(current, incoming)) {
        await tx.readingProgressRecord.upsert({
          where: {
            userId_releaseId: { userId: user.id, releaseId: release.id },
          },
          create: {
            userId: user.id,
            releaseId: release.id,
            chapterId: release.chapterId,
            ...incoming,
          },
          update: { chapterId: release.chapterId, ...incoming },
        })
      }
    })
    importedKeys.push(entry.key)
  }
  return NextResponse.json({ importedKeys })
}
