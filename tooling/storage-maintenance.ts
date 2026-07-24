import { createHash } from "node:crypto"
import { readdir, readFile, stat, unlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { db } from "../packages/db/src/index.ts"

interface ObjectInfo {
  key: string
  size: number
  sha256: string
  mime: string
}

const root = path.resolve(
  process.env.INIT_CWD ?? process.cwd(),
  process.env.LOCAL_STORAGE_PATH ?? "storage",
)
const apply = process.argv.includes("--apply")
const manifestArg = process.argv.find((argument) =>
  argument.startsWith("--manifest="),
)

function mimeFor(key: string) {
  const extension = path.extname(key).toLowerCase()
  return (
    {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
    }[extension] ?? "application/octet-stream"
  )
}

async function walk(directory: string): Promise<ObjectInfo[]> {
  const entries = await readdir(directory, { withFileTypes: true }).catch(
    () => [],
  )
  const objects: ObjectInfo[] = []
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      objects.push(...(await walk(absolute)))
      continue
    }
    if (!entry.isFile() || entry.name === ".gitkeep") continue
    const body = await readFile(absolute)
    objects.push({
      key: path.relative(root, absolute).split(path.sep).join("/"),
      size: body.length,
      sha256: createHash("sha256").update(body).digest("hex"),
      mime: mimeFor(entry.name),
    })
  }
  return objects
}

async function main() {
  const [pages, series, reports, avatars] = await Promise.all([
    db.releasePage.findMany({
      select: { storageKey: true, releaseId: true, mimeType: true },
    }),
    db.series.findMany({
      select: { id: true, coverStorageKey: true, bannerStorageKey: true },
    }),
    db.contentReport.findMany({
      where: { attachmentStorageKey: { not: null } },
      select: { id: true, attachmentStorageKey: true },
    }),
    db.user.findMany({
      where: { image: { startsWith: "/api/storage/" } },
      select: { id: true, image: true },
    }),
  ])
  const referenced = new Map<string, { relation: string; id: string }>()
  for (const page of pages)
    referenced.set(page.storageKey, { relation: "release", id: page.releaseId })
  for (const item of series) {
    if (item.coverStorageKey)
      referenced.set(item.coverStorageKey, { relation: "series", id: item.id })
    if (item.bannerStorageKey)
      referenced.set(item.bannerStorageKey, { relation: "series", id: item.id })
  }
  for (const report of reports) {
    if (report.attachmentStorageKey)
      referenced.set(report.attachmentStorageKey, {
        relation: "report",
        id: report.id,
      })
  }
  for (const avatar of avatars) {
    if (avatar.image)
      referenced.set(avatar.image.slice("/api/storage/".length), {
        relation: "user",
        id: avatar.id,
      })
  }

  const objects = await walk(root)
  const present = new Set(objects.map((object) => object.key))
  const missing = [...referenced.entries()]
    .filter(([key]) => !present.has(key))
    .map(([key, owner]) => ({ key, ...owner }))
  const orphan = objects.filter((object) => !referenced.has(object.key))
  const temporary = objects.filter((object) => object.key.endsWith(".tmp"))

  if (apply) {
    const cutoff = Date.now() - 24 * 60 * 60 * 1_000
    for (const object of temporary) {
      const absolute = path.resolve(root, object.key)
      const metadata = await stat(absolute)
      if (
        absolute.startsWith(`${root}${path.sep}`) &&
        metadata.mtimeMs < cutoff
      ) {
        await unlink(absolute)
      }
    }
  }

  if (manifestArg) {
    const output = path.resolve(manifestArg.slice("--manifest=".length))
    await writeFile(
      output,
      `${JSON.stringify(
        objects.map((object) => ({
          ...object,
          owner: referenced.get(object.key) ?? null,
        })),
        null,
        2,
      )}\n`,
      { mode: 0o600 },
    )
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        mode: apply ? "apply-old-temp-only" : "dry-run",
        root,
        totals: {
          referenced: referenced.size,
          stored: objects.length,
          missing: missing.length,
          orphan: orphan.length,
          temporary: temporary.length,
        },
        missing,
        orphan: orphan.map(({ key, size, sha256, mime }) => ({
          key,
          size,
          sha256,
          mime,
        })),
      },
      null,
      2,
    )}\n`,
  )
}

void main()
