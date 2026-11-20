import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { MandownBridgeError } from "~/features/translation/mandown-bridge"
import { getSourceCatalogProvider } from "~/features/translation/provider"
import { enforcePublicRateLimit } from "~/utils/api-security"

const querySchema = z.string().trim().min(1).max(120)
const idSchema = z.string().uuid()
const selectionSchema = z.object({
  selectionToken: z.string().min(1).max(200_000),
})

function upstreamError(error: unknown, fallback: string) {
  if (
    error instanceof MandownBridgeError &&
    error.errorType === "AniListRateLimitError"
  ) {
    const retryAfter =
      error.retryAfter ??
      (error.resetAt
        ? Math.max(1, error.resetAt - Math.floor(Date.now() / 1000))
        : 60)
    return NextResponse.json(
      {
        error:
          "AniList istek sınırına ulaşıldı. Lütfen belirtilen sürenin ardından tekrar deneyin.",
        retryAfter,
      },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      },
    )
  }
  return NextResponse.json({ error: fallback }, { status: 503 })
}

export async function GET(request: NextRequest) {
  const seriesId = request.nextUrl.searchParams.get("seriesId")
  const sourceEditionId = request.nextUrl.searchParams.get("sourceEditionId")

  if (seriesId) {
    const parsedId = idSchema.safeParse(seriesId)
    if (!parsedId.success)
      return NextResponse.json({ error: "Geçersiz seri." }, { status: 400 })
    const limited = await enforcePublicRateLimit(
      request,
      "translation-catalog-details",
      30,
      60,
    )
    if (limited) return limited
    try {
      const provider = getSourceCatalogProvider()
      const series = await provider.getSeriesDetails(parsedId.data)
      if (!series)
        return NextResponse.json({ error: "Seri bulunamadı." }, { status: 404 })
      if (sourceEditionId) {
        const parsedSourceId = idSchema.safeParse(sourceEditionId)
        if (!parsedSourceId.success)
          return NextResponse.json(
            { error: "Geçersiz kaynak." },
            { status: 400 },
          )
        if (
          !series.editions.some((edition) => edition.id === parsedSourceId.data)
        )
          return NextResponse.json(
            { error: "Kaynak bu seriye ait değil." },
            { status: 404 },
          )
        const edition = await provider.getSourceEditionDetails(
          parsedSourceId.data,
        )
        if (!edition)
          return NextResponse.json(
            { error: "Kaynak bulunamadı." },
            { status: 404 },
          )
        return NextResponse.json({ edition })
      }
      return NextResponse.json({ series })
    } catch (error) {
      return upstreamError(error, "Kaynak ayrıntıları yüklenemedi.")
    }
  }
  const query = querySchema.safeParse(request.nextUrl.searchParams.get("q"))
  if (!query.success) return NextResponse.json({ results: [] })
  const limited = await enforcePublicRateLimit(
    request,
    "translation-catalog-search",
    12,
    60,
  )
  if (limited) return limited
  try {
    const results = await getSourceCatalogProvider().searchSeries(query.data, {
      includeAdult: request.nextUrl.searchParams.get("includeAdult") === "1",
      onlyWithSources:
        request.nextUrl.searchParams.get("onlyWithSources") === "1",
    })
    return NextResponse.json({ results })
  } catch (error) {
    return upstreamError(error, "Kaynak kataloğuna şu anda ulaşılamıyor.")
  }
}

export async function POST(request: NextRequest) {
  const limited = await enforcePublicRateLimit(
    request,
    "translation-catalog-anilist-selection",
    20,
    60,
  )
  if (limited) return limited
  const parsed = selectionSchema.safeParse(
    await request.json().catch(() => null),
  )
  if (!parsed.success)
    return NextResponse.json(
      { error: "Geçersiz AniList seçimi." },
      { status: 400 },
    )
  try {
    const series = await getSourceCatalogProvider().selectSeries(
      parsed.data.selectionToken,
    )
    return NextResponse.json({ series })
  } catch (error) {
    return upstreamError(error, "Seri ayrıntıları yüklenemedi.")
  }
}
