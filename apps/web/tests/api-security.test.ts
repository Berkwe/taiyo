import assert from "node:assert/strict"
import test from "node:test"
import { NextRequest } from "next/server"
import {
  isAllowedWriteOrigin,
  publicRequestOrigins,
} from "../src/utils/request-origin.ts"

function originIsAllowed(request: NextRequest) {
  const origin = request.headers.get("origin")
  return origin
    ? isAllowedWriteOrigin(origin, publicRequestOrigins(request))
    : true
}

test("accepts a mobile LAN origin even when Next.js has an internal URL", () => {
  const request = new NextRequest(
    "http://localhost:3000/api/translation/quote",
    {
      method: "POST",
      headers: {
        host: "192.168.1.12:3000",
        origin: "http://192.168.1.12:3000",
        "sec-fetch-site": "same-origin",
      },
    },
  )

  assert.equal(originIsAllowed(request), true)
})

test("accepts the browser-facing origin supplied by a trusted proxy", () => {
  const request = new NextRequest(
    "http://localhost:3000/api/translation/quote",
    {
      method: "POST",
      headers: {
        host: "localhost:3000",
        origin: "https://novora.example",
        "sec-fetch-site": "same-origin",
        "x-forwarded-host": "novora.example",
        "x-forwarded-proto": "https",
      },
    },
  )

  assert.equal(originIsAllowed(request), true)
})

test("continues to reject a genuinely foreign origin", () => {
  const request = new NextRequest(
    "http://localhost:3000/api/translation/quote",
    {
      method: "POST",
      headers: {
        host: "192.168.1.12:3000",
        origin: "https://attacker.example",
        "sec-fetch-site": "cross-site",
      },
    },
  )

  assert.equal(originIsAllowed(request), false)
})
