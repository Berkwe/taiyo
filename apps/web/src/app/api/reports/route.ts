import { randomUUID } from "node:crypto"
import { cacheClient } from "@taiyomoe/cache"
import { db } from "@taiyomoe/db"
import { getStorage } from "@taiyomoe/storage"
import { parseImage } from "@taiyomoe/storage/cbz"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { currentActiveUser, resolveRelease } from "~/features/reading/server"
import { rejectCrossOriginWrite } from "~/utils/api-security"

export const runtime = "nodejs"

const chapterReasons = [
  "chapter_not_loading",
  "missing_or_wrong_chapter",
  "wrong_chapter_number",
  "other",
] as const
const panelReasons = [
  "image_not_loading",
  "missing_or_broken_image",
  "wrong_order",
  "translation_error",
  "typesetting_error",
  "source_text_remaining",
  "other",
] as const

const contextSchema = z.object({
  seriesId: z.string().max(180),
  seriesSlug: z.string().trim().min(1).max(180),
  chapterId: z.string().max(180),
  chapterNumber: z.string().trim().min(1).max(30),
  profileSlug: z.string().trim().min(1).max(100),
  targetLanguage: z.enum(["tr", "en"]),
  selection: z
    .object({
      startPage: z.number().int().min(1),
      endPage: z.number().int().min(1),
      storageKeys: z.array(z.string().max(500)).max(100),
      startY: z.number().min(0),
      endY: z.number().min(0),
      scrollY: z.number().min(0),
    })
    .optional(),
})

function safeOriginalName(name: string) {
  return (
    name
      .normalize("NFKD")
      .replace(/[^\w.-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || "report-image"
  )
}

export async function POST(request: NextRequest) {
  const rejected = rejectCrossOriginWrite(request)
  if (rejected) return rejected
  const user = await currentActiveUser()
  if (!user || user.banned) {
    return NextResponse.json(
      { error: "Rapor göndermek için giriş yapın." },
      { status: 401 },
    )
  }
  const limit = await cacheClient.rateLimit.consume(
    `reports:${user.id}`,
    5,
    3_600,
  )
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Saatlik rapor sınırına ulaştınız. Lütfen daha sonra deneyin." },
      { status: 429 },
    )
  }

  const formData = await request.formData()
  const type = z.enum(["CHAPTER", "PANEL"]).safeParse(formData.get("type"))
  const description = z
    .string()
    .trim()
    .max(2_000)
    .safeParse(formData.get("description") ?? "")
  let reasonsValue: unknown
  let contextValue: unknown
  try {
    reasonsValue = JSON.parse(String(formData.get("reasons") ?? "[]"))
    contextValue = JSON.parse(String(formData.get("context") ?? "{}"))
  } catch {
    return NextResponse.json(
      { error: "Geçersiz rapor verisi." },
      { status: 400 },
    )
  }
  const context = contextSchema.safeParse(contextValue)
  if (!type.success || !description.success || !context.success) {
    return NextResponse.json(
      { error: "Geçersiz rapor verisi." },
      { status: 400 },
    )
  }
  const allowedReasons = type.data === "CHAPTER" ? chapterReasons : panelReasons
  const reasons = z
    .array(z.enum(allowedReasons))
    .min(1)
    .max(1)
    .safeParse(reasonsValue)
  const file = formData.get("attachment")
  if (
    !reasons.success ||
    (reasons.success &&
      reasons.data[0] === "other" &&
      description.data.length === 0) ||
    (type.data === "PANEL" &&
      !context.data.selection &&
      !(file instanceof File && file.size > 0))
  ) {
    return NextResponse.json(
      { error: "Bir geçerli sebep seçin; diğer için açıklama yazın." },
      { status: 400 },
    )
  }
  const release = await resolveRelease(context.data)
  if (!release)
    return NextResponse.json({ error: "Sürüm bulunamadı." }, { status: 404 })

  let attachmentStorageKey: string | null = null
  let originalName: string | null = null
  try {
    if (file instanceof File && file.size > 0) {
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: "Ek görsel en fazla 5 MB olabilir." },
          { status: 400 },
        )
      }
      const image = parseImage(new Uint8Array(await file.arrayBuffer()))
      attachmentStorageKey = `reports/${user.id}/${randomUUID()}.${image.extension}`
      originalName = safeOriginalName(file.name)
      await getStorage().put(attachmentStorageKey, image.body, {
        contentType: image.mimeType,
      })
    }
    const report = await db.contentReport.create({
      data: {
        type: type.data,
        reasons: reasons.data,
        description: description.data || null,
        attachmentStorageKey,
        userId: user.id,
        releaseId: release.id,
        metadata: {
          ...context.data,
          userId: user.id,
          originalName,
          submittedAt: new Date().toISOString(),
        },
      },
      select: { id: true },
    })
    return NextResponse.json({ id: report.id }, { status: 201 })
  } catch (error) {
    if (attachmentStorageKey) await getStorage().delete(attachmentStorageKey)
    throw error
  }
}
