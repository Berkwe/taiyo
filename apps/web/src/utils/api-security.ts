import { createHash } from "node:crypto"
import { cacheClient } from "@taiyomoe/cache"
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

function requestFingerprint(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")
  const client =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    forwarded?.split(",").at(-1)?.trim() ??
    "unknown"
  const userAgent = request.headers.get("user-agent") ?? "unknown"
  return createHash("sha256")
    .update(`${client}\0${userAgent}`)
    .digest("hex")
    .slice(0, 32)
}

export async function enforcePublicRateLimit(
  request: NextRequest,
  scope: string,
  limit: number,
  windowSeconds: number,
) {
  const result = await cacheClient.rateLimit.consume(
    `${scope}:${requestFingerprint(request)}`,
    limit,
    windowSeconds,
  )
  if (result.allowed) return null
  return NextResponse.json(
    {
      error: "Çok fazla istek gönderdiniz. Lütfen biraz sonra tekrar deneyin.",
    },
    {
      status: 429,
      headers: { "Retry-After": String(windowSeconds) },
    },
  )
}

export function rejectOversizedBody(
  request: NextRequest,
  maximumBytes: number,
  multipartOverhead = 64 * 1024,
) {
  const value = request.headers.get("content-length")
  if (!value) return null
  if (
    !/^\d+$/.test(value) ||
    Number(value) > maximumBytes + multipartOverhead
  ) {
    return NextResponse.json(
      { error: "İstek gövdesi izin verilen boyutu aşıyor." },
      { status: 413 },
    )
  }
  return null
}
