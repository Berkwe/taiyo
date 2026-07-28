import { spawn } from "node:child_process"
import { randomUUID } from "node:crypto"
import { existsSync } from "node:fs"
import path from "node:path"
import { createInterface } from "node:readline"

export type MandownSourceProvider =
  | "mangadex"
  | "webtoons"
  | "naver"
  | "naver_series"

export interface MandownAniListTitle {
  romaji: string | null
  english: string | null
  native: string | null
}

export interface MandownAniListCover {
  extra_large: string | null
  large: string | null
  medium: string | null
  color: string | null
}

export interface MandownSearchItem {
  id: number
  id_mal: number | null
  title: MandownAniListTitle
  synonyms: string[]
  format: string | null
  status: string | null
  country_of_origin: string | null
  popularity: number | null
  average_score: number | null
  cover_image: MandownAniListCover | null
  site_url: string | null
}

export interface MandownSupportedSource {
  provider: MandownSourceProvider
  url: string
  language: string | null
  site: string
  type: string | null
  is_disabled: boolean
}

export interface MandownMangaDetailsOutput {
  manga: MandownSearchItem & {
    description: string | null
    chapters: number | null
    volumes: number | null
    genres: string[]
    external_links: Array<{
      site: string
      url: string
      type: string | null
      language: string | null
      is_disabled: boolean | null
      notes: string | null
    }>
  }
  sources: MandownSupportedSource[]
}

export interface MandownSearchOutput {
  items: MandownMangaDetailsOutput[]
  pageInfo: {
    current_page: number | null
    last_page: number | null
    has_next_page: boolean
    per_page: number | null
    total: number | null
  }
}

export interface MandownSourceDetailsOutput {
  metadata: {
    title: string
    authors: string[]
    url: string
    genres: string[]
    description: string
    cover_art: string
    title_slug: string
  }
  chapters: Array<{
    title: string
    url: string
    slug: string
    chapterNumber: string
  }>
}

export class MandownBridgeError extends Error {
  constructor(
    message: string,
    readonly errorType?: string,
    readonly retryAfter?: number,
    readonly resetAt?: number,
  ) {
    super(message)
    this.name = "MandownBridgeError"
  }
}

export function isUnavailableNaverMirrorError(error: unknown) {
  return (
    error instanceof Error &&
    "errorType" in error &&
    error.errorType === "SourceResponseError" &&
    error.message.includes("no downloadable Naver Webtoon mirror matched")
  )
}

export interface MandownDownloadOutput {
  title: string
  titleSlug: string
  destination: string
  chapterNumbers: string[]
  files: string[]
  coverPath: string | null
  archives: Array<{
    chapterNumber: string
    title: string
    slug: string
    path: string
  }>
  threadAlive: boolean
}

function workspaceRoot() {
  const candidates = [
    process.env.NOVORA_ROOT,
    process.env.INIT_CWD,
    process.cwd(),
  ]
  for (const candidate of candidates) {
    if (
      candidate &&
      existsSync(path.join(candidate, "tooling", "mandown_bridge.py"))
    )
      return candidate
  }
  let current = process.cwd()
  while (path.dirname(current) !== current) {
    current = path.dirname(current)
    if (existsSync(path.join(current, "tooling", "mandown_bridge.py")))
      return current
  }
  throw new Error("Novora workspace kökü bulunamadı.")
}

function pythonExecutable(root: string) {
  return (
    process.env.MANDOWN_PYTHON ??
    path.join(root, ".venv-mandown", "bin", "python")
  )
}

interface MandownServiceFrame {
  id: string | null
  result?: unknown
  error?: string
  errorType?: string
  retryAfter?: number | null
  resetAt?: number | null
}

interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timer: NodeJS.Timeout
}

class MandownServiceTransportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "MandownServiceTransportError"
  }
}

class MandownService {
  readonly child
  readonly pending = new Map<string, PendingRequest>()
  private closed = false
  private stderr = ""

  constructor(root: string, python: string) {
    this.child = spawn(
      python,
      [path.join(root, "tooling", "mandown_bridge.py"), "serve"],
      {
        cwd: root,
        env: process.env,
        stdio: ["pipe", "pipe", "pipe"],
      },
    )
    this.child.unref()
    for (const stream of [
      this.child.stdin,
      this.child.stdout,
      this.child.stderr,
    ]) {
      ;(
        stream as typeof stream & {
          unref?: () => void
        }
      ).unref?.()
    }

    this.child.stdout.setEncoding("utf8")
    this.child.stderr.setEncoding("utf8")
    createInterface({ input: this.child.stdout }).on("line", (line) => {
      this.handleLine(line)
    })
    this.child.stderr.on("data", (chunk: string) => {
      this.stderr = `${this.stderr}${chunk}`.slice(-8_000)
    })
    this.child.on("error", (error) => {
      this.fail(
        new MandownServiceTransportError(
          `Mandown Python servisi başlatılamadı (${python}): ${error.message}`,
        ),
      )
    })
    this.child.on("close", (code) => {
      this.fail(
        new MandownServiceTransportError(
          `Mandown Python servisi kapandı: ${this.stderr.trim() || code}`,
        ),
      )
    })
  }

  request<T>(
    args: string[],
    timeoutMs: number,
    extraEnv?: Record<string, string>,
  ): Promise<T> {
    if (this.closed)
      return Promise.reject(
        new MandownServiceTransportError("Mandown Python servisi kapalı."),
      )
    return new Promise<T>((resolve, reject) => {
      const id = randomUUID()
      const timer = setTimeout(() => {
        this.pending.delete(id)
        const error = new MandownServiceTransportError(
          "Mandown işlemi zaman aşımına uğradı.",
        )
        reject(error)
        this.stop()
      }, timeoutMs)
      this.pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timer,
      })
      this.child.stdin.write(
        `${JSON.stringify({ id, args, env: extraEnv ?? {} })}\n`,
        (error) => {
          if (!error) return
          const pending = this.pending.get(id)
          if (!pending) return
          clearTimeout(pending.timer)
          this.pending.delete(id)
          pending.reject(
            new MandownServiceTransportError(
              `Mandown servis isteği yazılamadı: ${error.message}`,
            ),
          )
          this.stop()
        },
      )
    })
  }

  isClosed() {
    return this.closed
  }

  stop() {
    if (this.closed) return
    this.closed = true
    this.child.kill("SIGTERM")
    this.fail(new MandownServiceTransportError("Mandown servisi durduruldu."))
  }

  private handleLine(line: string) {
    let frame: MandownServiceFrame
    try {
      frame = JSON.parse(line) as MandownServiceFrame
    } catch {
      this.fail(
        new MandownServiceTransportError(
          `Mandown servisi geçersiz çıktı döndürdü: ${line}`,
        ),
      )
      this.child.kill("SIGTERM")
      return
    }
    if (!frame.id) return
    const pending = this.pending.get(frame.id)
    if (!pending) return
    clearTimeout(pending.timer)
    this.pending.delete(frame.id)
    if (frame.error) {
      pending.reject(
        new MandownBridgeError(
          frame.error,
          frame.errorType,
          frame.retryAfter ?? undefined,
          frame.resetAt ?? undefined,
        ),
      )
      return
    }
    pending.resolve(frame.result)
  }

  private fail(error: MandownServiceTransportError) {
    if (!this.closed) this.closed = true
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer)
      pending.reject(error)
    }
    this.pending.clear()
  }
}

const globalForMandown = globalThis as typeof globalThis & {
  novoraMandownService?: MandownService
}

function service() {
  const current = globalForMandown.novoraMandownService
  if (current && !current.isClosed()) return current
  const root = workspaceRoot()
  const created = new MandownService(root, pythonExecutable(root))
  globalForMandown.novoraMandownService = created
  return created
}

async function runMandownSubprocess<T>(
  args: string[],
  timeoutMs: number,
  extraEnv?: Record<string, string>,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const root = workspaceRoot()
    const python = pythonExecutable(root)
    const child = spawn(
      python,
      [path.join(root, "tooling", "mandown_bridge.py"), ...args],
      {
        cwd: root,
        env: { ...process.env, ...extraEnv },
        stdio: ["ignore", "pipe", "pipe"],
      },
    )
    let stdout = ""
    let stderr = ""
    const timer = setTimeout(() => {
      child.kill("SIGTERM")
      reject(new Error("Mandown işlemi zaman aşımına uğradı."))
    }, timeoutMs)
    child.stdout.setEncoding("utf8")
    child.stderr.setEncoding("utf8")
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk
    })
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk
    })
    child.on("error", (error) => {
      clearTimeout(timer)
      reject(
        new Error(`Mandown Python başlatılamadı (${python}): ${error.message}`),
      )
    })
    child.on("close", (code) => {
      clearTimeout(timer)
      let parsed:
        | (T & {
            error?: string
            errorType?: string
            retryAfter?: number | null
            resetAt?: number | null
          })
        | undefined
      try {
        parsed = JSON.parse(stdout.trim()) as T & { error?: string }
      } catch {
        reject(
          new Error(
            `Mandown geçersiz çıktı döndürdü: ${stderr || stdout || code}`,
          ),
        )
        return
      }
      if (code !== 0 || parsed.error) {
        reject(
          new MandownBridgeError(
            parsed.error ?? stderr.trim() ?? "Mandown başarısız.",
            parsed.errorType,
            parsed.retryAfter ?? undefined,
            parsed.resetAt ?? undefined,
          ),
        )
        return
      }
      resolve(parsed)
    })
  })
}

export async function runMandown<T>(
  args: string[],
  timeoutMs: number,
  extraEnv?: Record<string, string>,
): Promise<T> {
  try {
    return await service().request<T>(args, timeoutMs, extraEnv)
  } catch (error) {
    if (!(error instanceof MandownServiceTransportError)) throw error
    globalForMandown.novoraMandownService?.stop()
    globalForMandown.novoraMandownService = undefined
    return runMandownSubprocess<T>(args, timeoutMs, extraEnv)
  }
}

export const mandownSearch = (query: string) =>
  runMandown<MandownSearchOutput>(["search", query], 90_000)

export const mandownMangaDetails = (anilistId: number) =>
  runMandown<MandownMangaDetailsOutput>(
    ["manga-details", String(anilistId)],
    90_000,
  )

export async function mandownSourceDetails(url: string) {
  try {
    return await runMandown<MandownSourceDetailsOutput>(
      ["source-details", url],
      120_000,
    )
  } catch (error) {
    if (isUnavailableNaverMirrorError(error)) throw error
    await new Promise((resolve) => setTimeout(resolve, 250))
    return runMandown<MandownSourceDetailsOutput>(
      ["source-details", url],
      120_000,
    )
  }
}

export const mandownDownload = (input: {
  url: string
  chapterNumbers: string[]
  destination: string
  downloadRoot: string
}) =>
  runMandown<MandownDownloadOutput>(
    ["download", input.url, input.destination, ...input.chapterNumbers],
    30 * 60_000,
    { MANDOWN_DOWNLOAD_ROOT: input.downloadRoot },
  )
