import { type NextRequest, NextResponse } from "next/server"
import { getPublicSeriesSearchItems } from "~/features/platform/server-series"

export async function GET(request: NextRequest) {
  const locale =
    request.nextUrl.searchParams.get("locale") === "en" ? "en" : "tr"
  const query = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 120)
  const results = await getPublicSeriesSearchItems({ locale, query })
  return NextResponse.json(
    { results },
    {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
      },
    },
  )
}
