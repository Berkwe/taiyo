import { db } from "@taiyomoe/db"
import { getStorage } from "@taiyomoe/storage"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const allowedCoverHosts = new Set([
  "webtoon-phinf.pstatic.net",
  "swebtoon-phinf.pstatic.net",
  "image-comic.pstatic.net",
  "shared-comic.pstatic.net",
  "ssl.pstatic.net",
  "uploads.mangadex.org",
  "s4.anilist.co",
])

const storageContentTypes: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ seriesId: string }> },
) {
  const { seriesId } = await params
  if (!z.string().uuid().safeParse(seriesId).success)
    return new NextResponse(null, { status: 404 })
  const series = await db.catalogSeries.findUnique({
    where: { id: seriesId, isActive: true },
    select: {
      canonicalSeriesId: true,
      coverPath: true,
      providerKey: true,
    },
  })
  if (!series?.providerKey.startsWith("mandown:"))
    return new NextResponse(null, { status: 404 })
  if (series.canonicalSeriesId) {
    const canonicalSeries = await db.series.findFirst({
      where: {
        id: series.canonicalSeriesId,
        deletedAt: null,
        publishedAt: { not: null },
        coverStorageKey: { not: null },
      },
      select: { coverStorageKey: true },
    })
    if (canonicalSeries?.coverStorageKey) {
      const object = await getStorage().read(canonicalSeries.coverStorageKey)
      if (object) {
        const extension =
          canonicalSeries.coverStorageKey
            .split(".")
            .pop()
            ?.toLocaleLowerCase("en") ?? ""
        const body = new Uint8Array(object.body.byteLength)
        body.set(object.body)
        return new NextResponse(body.buffer, {
          headers: {
            "Cache-Control":
              "public, max-age=3600, stale-while-revalidate=86400",
            "Content-Type":
              object.contentType ??
              storageContentTypes[extension] ??
              "application/octet-stream",
            "X-Content-Type-Options": "nosniff",
          },
        })
      }
    }
  }
  if (!series.coverPath) return new NextResponse(null, { status: 404 })
  let url: URL
  try {
    url = new URL(series.coverPath)
  } catch {
    return new NextResponse(null, { status: 404 })
  }
  if (url.protocol !== "https:" || !allowedCoverHosts.has(url.hostname))
    return new NextResponse(null, { status: 403 })
  const response = await fetch(url, {
    headers: {
      Referer:
        url.hostname === "s4.anilist.co"
          ? "https://anilist.co/"
          : url.hostname === "uploads.mangadex.org"
            ? "https://mangadex.org/"
            : url.hostname.startsWith("webtoon-")
              ? "https://www.webtoons.com/"
              : "https://comic.naver.com/",
      "User-Agent":
        "Mozilla/5.0 (compatible; NovoraScans/1.0; +https://novorascans.com)",
    },
    signal: AbortSignal.timeout(20_000),
  })
  const contentType = response.headers.get("content-type") ?? ""
  if (!response.ok || !contentType.startsWith("image/"))
    return new NextResponse(null, { status: 502 })
  return new NextResponse(response.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  })
}
