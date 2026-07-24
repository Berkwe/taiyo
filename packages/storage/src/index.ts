import { createHash, randomUUID } from "node:crypto"
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"

export type StorageDriver = "local" | "r2"

export interface StoredObject {
  body: Uint8Array
  contentType?: string
}

export interface StorageAdapter {
  readonly driver: StorageDriver
  put(
    key: string,
    body: Uint8Array,
    options: { contentType: string },
  ): Promise<void>
  read(key: string): Promise<StoredObject | null>
  delete(key: string): Promise<void>
  url(key: string): string
}

function storageDriver(): StorageDriver {
  const value = process.env.STORAGE_DRIVER ?? "local"
  if (value !== "local" && value !== "r2") {
    throw new Error("STORAGE_DRIVER must be either local or r2")
  }
  return value
}

export function assertStorageKey(key: string) {
  if (
    !key ||
    key.startsWith("/") ||
    key.includes("\\") ||
    key.includes("\0") ||
    key.split("/").some((segment) => !segment || segment === "..")
  ) {
    throw new Error("Invalid storage key")
  }
  return key
}

function localRoot() {
  const invocationRoot = process.env.INIT_CWD ?? process.cwd()
  return path.resolve(
    invocationRoot,
    process.env.LOCAL_STORAGE_PATH ?? "storage",
  )
}

function localPath(key: string) {
  const root = localRoot()
  const target = path.resolve(root, assertStorageKey(key))
  if (!target.startsWith(`${root}${path.sep}`)) {
    throw new Error("Storage key escapes local root")
  }
  return target
}

class LocalStorageAdapter implements StorageAdapter {
  readonly driver = "local" as const

  async put(key: string, body: Uint8Array, _options: { contentType: string }) {
    const target = localPath(key)
    await mkdir(path.dirname(target), { recursive: true })
    const temporary = `${target}.${randomUUID()}.tmp`
    await writeFile(temporary, body, { flag: "wx" })
    await rename(temporary, target)
  }

  async read(key: string) {
    try {
      return { body: await readFile(localPath(key)) }
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return null
      }
      throw error
    }
  }

  async delete(key: string) {
    await rm(localPath(key), { force: true })
  }

  url(key: string) {
    return `/api/storage/${assertStorageKey(key)
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`
  }
}

function required(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required when STORAGE_DRIVER=r2`)
  return value
}

class R2StorageAdapter implements StorageAdapter {
  readonly driver = "r2" as const
  readonly #client: S3Client
  readonly #bucket: string

  constructor() {
    this.#bucket = required("R2_BUCKET")
    this.#client = new S3Client({
      region: "auto",
      endpoint: required("R2_ENDPOINT"),
      credentials: {
        accessKeyId: required("R2_ACCESS_KEY_ID"),
        secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
      },
    })
  }

  async put(key: string, body: Uint8Array, options: { contentType: string }) {
    await this.#client.send(
      new PutObjectCommand({
        Bucket: this.#bucket,
        Key: assertStorageKey(key),
        Body: body,
        ContentType: options.contentType,
      }),
    )
  }

  async read(key: string) {
    try {
      const result = await this.#client.send(
        new GetObjectCommand({
          Bucket: this.#bucket,
          Key: assertStorageKey(key),
        }),
      )
      if (!result.Body) return null
      return {
        body: await result.Body.transformToByteArray(),
        contentType: result.ContentType,
      }
    } catch (error) {
      if (
        error instanceof Error &&
        "$metadata" in error &&
        (error as { $metadata?: { httpStatusCode?: number } }).$metadata
          ?.httpStatusCode === 404
      ) {
        return null
      }
      throw error
    }
  }

  async delete(key: string) {
    await this.#client.send(
      new DeleteObjectCommand({
        Bucket: this.#bucket,
        Key: assertStorageKey(key),
      }),
    )
  }

  url(key: string) {
    return `/api/storage/${assertStorageKey(key)
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`
  }
}

let adapter: StorageAdapter | undefined

export function getStorage(): StorageAdapter {
  adapter ??=
    storageDriver() === "local"
      ? new LocalStorageAdapter()
      : new R2StorageAdapter()
  return adapter
}

export function checksum(body: Uint8Array) {
  return createHash("sha256").update(body).digest("hex")
}

export function storageUrl(key: string | null | undefined) {
  return key ? getStorage().url(key) : null
}
