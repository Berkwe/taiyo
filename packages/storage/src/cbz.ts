import { unzipSync } from "fflate"

export const CBZ_LIMITS = {
  archiveBytes: 100 * 1024 * 1024,
  entries: 1_000,
  images: 500,
  imageBytes: 25 * 1024 * 1024,
  expandedBytes: 250 * 1024 * 1024,
  compressionRatio: 200,
} as const

const supportedExtensions = new Set(["jpg", "jpeg", "png", "webp"])
const naturalCollator = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
})

interface CentralEntry {
  name: string
  compressedSize: number
  uncompressedSize: number
  compressionMethod: number
  flags: number
  externalAttributes: number
}

export interface CbzImage {
  name: string
  extension: "jpg" | "png" | "webp"
  mimeType: "image/jpeg" | "image/png" | "image/webp"
  width: number
  height: number
  body: Uint8Array
}

function fail(message: string): never {
  throw new Error(`Geçersiz CBZ: ${message}`)
}

function findEndOfCentralDirectory(data: Uint8Array) {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  const start = Math.max(0, data.length - 65_557)
  for (let offset = data.length - 22; offset >= start; offset--) {
    if (view.getUint32(offset, true) === 0x06054b50) return offset
  }
  return fail("ZIP merkez dizini bulunamadı")
}

function decodeName(data: Uint8Array) {
  return new TextDecoder("utf-8", { fatal: true }).decode(data)
}

function readCentralEntries(data: Uint8Array): CentralEntry[] {
  if (data.length > CBZ_LIMITS.archiveBytes) {
    fail("arşiv 100 MB sınırını aşıyor")
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  const eocd = findEndOfCentralDirectory(data)
  const count = view.getUint16(eocd + 10, true)
  const centralSize = view.getUint32(eocd + 12, true)
  const centralOffset = view.getUint32(eocd + 16, true)
  if (
    count === 0xffff ||
    centralSize === 0xffffffff ||
    centralOffset === 0xffffffff
  ) {
    fail("ZIP64 arşivleri desteklenmiyor")
  }
  if (count === 0 || count > CBZ_LIMITS.entries) {
    fail(`dosya sayısı 1-${CBZ_LIMITS.entries} aralığında olmalı`)
  }
  if (centralOffset + centralSize > eocd) fail("merkez dizini bozuk")

  const entries: CentralEntry[] = []
  let offset = centralOffset
  for (let index = 0; index < count; index++) {
    if (
      offset + 46 > data.length ||
      view.getUint32(offset, true) !== 0x02014b50
    ) {
      fail("merkez dizini girdisi bozuk")
    }
    const nameLength = view.getUint16(offset + 28, true)
    const extraLength = view.getUint16(offset + 30, true)
    const commentLength = view.getUint16(offset + 32, true)
    const next = offset + 46 + nameLength + extraLength + commentLength
    if (next > data.length) fail("dosya adı sınırları bozuk")
    const name = decodeName(
      data.subarray(offset + 46, offset + 46 + nameLength),
    )
    entries.push({
      name,
      flags: view.getUint16(offset + 8, true),
      compressionMethod: view.getUint16(offset + 10, true),
      compressedSize: view.getUint32(offset + 20, true),
      uncompressedSize: view.getUint32(offset + 24, true),
      externalAttributes: view.getUint32(offset + 38, true),
    })
    offset = next
  }
  return entries
}

function safeArchiveName(name: string) {
  const normalized = name.replaceAll("\\", "/")
  if (
    !normalized ||
    normalized.startsWith("/") ||
    normalized.includes("\0") ||
    normalized.split("/").some((part) => part === "..")
  ) {
    fail("güvenli olmayan dosya yolu")
  }
  return normalized
}

function imageExtension(name: string) {
  const extension = name.split(".").pop()?.toLocaleLowerCase("en")
  return extension && supportedExtensions.has(extension) ? extension : null
}

export function inspectImage(body: Uint8Array) {
  const view = new DataView(body.buffer, body.byteOffset, body.byteLength)
  if (
    body.length >= 24 &&
    view.getUint32(0) === 0x89504e47 &&
    view.getUint32(4) === 0x0d0a1a0a
  ) {
    return {
      extension: "png" as const,
      mimeType: "image/png" as const,
      width: view.getUint32(16),
      height: view.getUint32(20),
    }
  }
  if (
    body.length >= 30 &&
    new TextDecoder().decode(body.subarray(0, 4)) === "RIFF"
  ) {
    const signature = new TextDecoder().decode(body.subarray(8, 12))
    const chunk = new TextDecoder().decode(body.subarray(12, 16))
    if (signature === "WEBP" && chunk === "VP8X") {
      return {
        extension: "webp" as const,
        mimeType: "image/webp" as const,
        width:
          1 +
          view.getUint8(24) +
          (view.getUint8(25) << 8) +
          (view.getUint8(26) << 16),
        height:
          1 +
          view.getUint8(27) +
          (view.getUint8(28) << 8) +
          (view.getUint8(29) << 16),
      }
    }
    if (
      signature === "WEBP" &&
      chunk === "VP8 " &&
      body.length >= 30 &&
      body[23] === 0x9d &&
      body[24] === 0x01 &&
      body[25] === 0x2a
    ) {
      return {
        extension: "webp" as const,
        mimeType: "image/webp" as const,
        width: view.getUint16(26, true) & 0x3fff,
        height: view.getUint16(28, true) & 0x3fff,
      }
    }
    if (
      signature === "WEBP" &&
      chunk === "VP8L" &&
      body.length >= 25 &&
      body[20] === 0x2f
    ) {
      return {
        extension: "webp" as const,
        mimeType: "image/webp" as const,
        width: 1 + body[21]! + ((body[22]! & 0x3f) << 8),
        height:
          1 + (body[22]! >> 6) + (body[23]! << 2) + ((body[24]! & 0x0f) << 10),
      }
    }
  }
  if (body.length >= 4 && body[0] === 0xff && body[1] === 0xd8) {
    let offset = 2
    while (offset + 9 < body.length) {
      if (body[offset] !== 0xff) {
        offset++
        continue
      }
      const marker = body[offset + 1]!
      if (marker === 0xd8 || marker === 0xd9) {
        offset += 2
        continue
      }
      const size = view.getUint16(offset + 2)
      if (size < 2 || offset + 2 + size > body.length) break
      if (
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf)
      ) {
        return {
          extension: "jpg" as const,
          mimeType: "image/jpeg" as const,
          height: view.getUint16(offset + 5),
          width: view.getUint16(offset + 7),
        }
      }
      offset += 2 + size
    }
  }
  return fail("desteklenmeyen veya bozuk görsel")
}

export function naturalImageSort(left: string, right: string) {
  return naturalCollator.compare(left, right)
}

export function parseCbz(input: Uint8Array): CbzImage[] {
  const entries = readCentralEntries(input)
  const accepted = new Map<string, CentralEntry>()
  let expandedBytes = 0

  for (const entry of entries) {
    const name = safeArchiveName(entry.name)
    const unixType = (entry.externalAttributes >>> 16) & 0xf000
    if (unixType === 0xa000) fail("sembolik bağlantı içeriyor")
    if ((entry.flags & 1) !== 0) fail("şifreli arşiv desteklenmiyor")
    if (![0, 8].includes(entry.compressionMethod)) {
      fail("desteklenmeyen sıkıştırma yöntemi")
    }
    if (name.endsWith("/") || !imageExtension(name)) continue
    if (entry.uncompressedSize > CBZ_LIMITS.imageBytes) {
      fail("bir görsel 25 MB sınırını aşıyor")
    }
    if (
      entry.compressedSize > 0 &&
      entry.uncompressedSize / entry.compressedSize >
        CBZ_LIMITS.compressionRatio
    ) {
      fail("şüpheli sıkıştırma oranı")
    }
    expandedBytes += entry.uncompressedSize
    if (expandedBytes > CBZ_LIMITS.expandedBytes) {
      fail("açılmış arşiv 250 MB sınırını aşıyor")
    }
    if (accepted.has(name)) fail("yinelenen dosya adı")
    accepted.set(name, entry)
  }
  if (accepted.size === 0 || accepted.size > CBZ_LIMITS.images) {
    fail(`görsel sayısı 1-${CBZ_LIMITS.images} aralığında olmalı`)
  }

  const extracted = unzipSync(input, {
    filter: (file) => accepted.has(safeArchiveName(file.name)),
  })

  return [...accepted.keys()].sort(naturalImageSort).map((name) => {
    const body = extracted[name]
    const expected = accepted.get(name)!
    if (!body || body.length !== expected.uncompressedSize) {
      return fail("açılan görsel boyutu merkez diziniyle uyuşmuyor")
    }
    const metadata = inspectImage(body)
    const declared = imageExtension(name)
    if (
      (declared === "jpg" || declared === "jpeg" ? "jpg" : declared) !==
      metadata.extension
    ) {
      return fail("dosya uzantısı görsel içeriğiyle uyuşmuyor")
    }
    if (metadata.width < 1 || metadata.height < 1) {
      return fail("geçersiz görsel ölçüsü")
    }
    return { name, body, ...metadata }
  })
}

export function parseImage(input: Uint8Array) {
  if (input.length === 0 || input.length > CBZ_LIMITS.imageBytes) {
    throw new Error("Görsel 1 bayt ile 25 MB arasında olmalı")
  }
  return { body: input, ...inspectImage(input) }
}
