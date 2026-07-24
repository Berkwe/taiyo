import { parseCbz } from "@taiyomoe/storage/cbz"
import { type NextRequest, NextResponse } from "next/server"
import { requireManagementUser } from "~/features/management/server"
import { rejectCrossOriginWrite } from "~/utils/api-security"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const rejected = rejectCrossOriginWrite(request)
  if (rejected) return rejected
  await requireManagementUser("chapter:write")
  try {
    const formData = await request.formData()
    const file = formData.get("cbz")
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".cbz")) {
      return NextResponse.json(
        { error: "Bir .cbz dosyası seçin." },
        { status: 400 },
      )
    }
    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json(
        { error: "CBZ dosyası en fazla 100 MB olabilir." },
        { status: 413 },
      )
    }
    const images = parseCbz(new Uint8Array(await file.arrayBuffer()))
    let previewBytes = 0
    const previews = images.slice(0, 12).map((image, index) => {
      const canInline =
        image.body.length <= 1_500_000 &&
        previewBytes + image.body.length <= 8_000_000
      if (canInline) previewBytes += image.body.length
      return {
        pageNumber: index + 1,
        name: image.name,
        width: image.width,
        height: image.height,
        src: canInline
          ? `data:${image.mimeType};base64,${Buffer.from(image.body).toString("base64")}`
          : null,
      }
    })
    return NextResponse.json({ pageCount: images.length, previews })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "CBZ okunamadı." },
      { status: 400 },
    )
  }
}
