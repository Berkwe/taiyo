import { createHash } from "node:crypto"
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"

const apply = process.argv.includes("--apply")
const localRoot = path.resolve(
  process.env.INIT_CWD ?? process.cwd(),
  process.env.LOCAL_STORAGE_PATH ?? "storage",
)

function required(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

const bucket = required("R2_BUCKET")
const client = new S3Client({
  region: "auto",
  endpoint: required("R2_ENDPOINT"),
  credentials: {
    accessKeyId: required("R2_ACCESS_KEY_ID"),
    secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
  },
})

async function walk(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const keys: string[] = []
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) keys.push(...(await walk(absolute)))
    else if (entry.isFile() && !entry.name.endsWith(".tmp")) {
      keys.push(path.relative(localRoot, absolute).split(path.sep).join("/"))
    }
  }
  return keys
}

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

let copied = 0
let skipped = 0
let failed = 0
for (const [index, key] of (await walk(localRoot)).entries()) {
  const body = await readFile(path.join(localRoot, key))
  const localHash = createHash("sha256").update(body).digest("hex")
  try {
    const remote = await client.send(
      new HeadObjectCommand({ Bucket: bucket, Key: key }),
    )
    if (remote.ContentLength === body.length) {
      skipped++
      process.stdout.write(
        `[${index + 1}] skip ${key} (${body.length} bytes)\n`,
      )
      continue
    }
    throw new Error(`remote size mismatch for ${key}`)
  } catch (error) {
    const status =
      error instanceof Error && "$metadata" in error
        ? (error as { $metadata?: { httpStatusCode?: number } }).$metadata
            ?.httpStatusCode
        : undefined
    if (
      status !== 404 &&
      !(error instanceof Error && error.name === "NotFound")
    ) {
      failed++
      process.stderr.write(
        `${error instanceof Error ? error.message : String(error)}\n`,
      )
      continue
    }
  }
  if (!apply) {
    process.stdout.write(
      `[${index + 1}] dry-run upload ${key} sha256=${localHash}\n`,
    )
    continue
  }
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: mimeFor(key),
      Metadata: { sha256: localHash },
    }),
  )
  const verified = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  )
  if (verified.ContentLength !== body.length) {
    throw new Error(`verification failed for ${key}`)
  }
  copied++
  process.stdout.write(`[${index + 1}] uploaded ${key}\n`)
}
process.stdout.write(
  `${JSON.stringify({ mode: apply ? "apply" : "dry-run", copied, skipped, failed })}\n`,
)
if (failed) process.exitCode = 1
