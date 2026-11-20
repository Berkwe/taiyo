import assert from "node:assert/strict"
import test from "node:test"
import { createClientIdempotencyKey } from "../src/utils/client-idempotency-key.ts"

test("uses randomUUID when the browser provides it", () => {
  assert.equal(
    createClientIdempotencyKey({
      randomUUID: () => "native-random-uuid",
    }),
    "native-random-uuid",
  )
})

test("creates a UUID-shaped key when randomUUID is unavailable on HTTP LAN", () => {
  const key = createClientIdempotencyKey({
    getRandomValues: (values) => {
      values.forEach((_, index) => {
        values[index] = index
      })
      return values
    },
  })

  assert.equal(key, "00010203-0405-4607-8809-0a0b0c0d0e0f")
})
