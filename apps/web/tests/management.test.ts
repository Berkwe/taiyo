import assert from "node:assert/strict"
import test from "node:test"
import { zipSync } from "fflate"
import {
  naturalImageSort,
  parseCbz,
} from "../../../packages/storage/src/cbz.ts"
import { assertStorageKey } from "../../../packages/storage/src/index.ts"
import { hasPermission } from "../src/features/management/permissions.ts"

function png(width = 20, height = 30) {
  const bytes = new Uint8Array(24)
  const view = new DataView(bytes.buffer)
  view.setUint32(0, 0x89504e47)
  view.setUint32(4, 0x0d0a1a0a)
  view.setUint32(16, width)
  view.setUint32(20, height)
  return bytes
}

test("management roles enforce publish and user boundaries", () => {
  assert.equal(hasPermission("USER", "series:write"), false)
  assert.equal(hasPermission("UPLOADER", "chapter:write"), true)
  assert.equal(hasPermission("UPLOADER", "content:publish"), false)
  assert.equal(hasPermission("EDITOR", "content:publish"), true)
  assert.equal(hasPermission("EDITOR", "users:manage"), false)
  assert.equal(hasPermission("ADMIN", "users:manage"), true)
})

test("storage keys reject absolute and traversal paths", () => {
  assert.equal(
    assertStorageKey("covers/series/id/cover.png"),
    "covers/series/id/cover.png",
  )
  assert.throws(() => assertStorageKey("/etc/passwd"))
  assert.throws(() => assertStorageKey("covers/../secret"))
  assert.throws(() => assertStorageKey("covers\\secret"))
})

test("CBZ images are naturally ordered and inspected", () => {
  const archive = zipSync({
    "pages/10.png": png(100, 200),
    "pages/2.png": png(80, 160),
    "pages/1.png": png(60, 120),
    "ComicInfo.xml": new TextEncoder().encode("<ComicInfo />"),
  })
  const images = parseCbz(archive)
  assert.deepEqual(
    images.map((image) => image.name),
    ["pages/1.png", "pages/2.png", "pages/10.png"],
  )
  assert.deepEqual(
    images.map((image) => [image.width, image.height]),
    [
      [60, 120],
      [80, 160],
      [100, 200],
    ],
  )
})

test("CBZ rejects traversal paths", () => {
  const archive = zipSync({ "../page.png": png() })
  assert.throws(() => parseCbz(archive), /güvenli olmayan dosya yolu/)
})

test("natural ordering handles decimal page names", () => {
  assert.deepEqual(
    ["page-10.jpg", "page-2.jpg", "page-1.jpg"].sort(naturalImageSort),
    ["page-1.jpg", "page-2.jpg", "page-10.jpg"],
  )
})
