import { type NextRequest, NextResponse } from "next/server"

export function rejectCrossOriginWrite(request: NextRequest) {
  const origin = request.headers.get("origin")
  const fetchSite = request.headers.get("sec-fetch-site")
  if (
    (origin && origin !== request.nextUrl.origin) ||
    (fetchSite && !["same-origin", "same-site", "none"].includes(fetchSite))
  ) {
    return NextResponse.json(
      { error: "Geçersiz istek kaynağı." },
      { status: 403 },
    )
  }
  return null
}
