"use client"

import { useState } from "react"
import { uploadCbz } from "./actions"

interface Preview {
  pageNumber: number
  name: string
  width: number
  height: number
  src: string | null
}

export function CbzUploadForm({ seriesId }: { seriesId: string }) {
  const [previews, setPreviews] = useState<Preview[]>([])
  const [pageCount, setPageCount] = useState(0)
  const [message, setMessage] = useState("")

  async function preview(file: File | undefined) {
    setPreviews([])
    setPageCount(0)
    if (!file) return
    setMessage("Arşiv güvenlik kontrolünden geçiriliyor…")
    const body = new FormData()
    body.set("cbz", file)
    const response = await fetch("/api/admin/cbz/preview", {
      method: "POST",
      body,
    })
    const result = (await response.json()) as {
      error?: string
      pageCount?: number
      previews?: Preview[]
    }
    if (!response.ok) {
      setMessage(result.error ?? "Önizleme oluşturulamadı.")
      return
    }
    setPreviews(result.previews ?? [])
    setPageCount(result.pageCount ?? 0)
    setMessage(`${result.pageCount} sayfa doğal sırada doğrulandı.`)
  }

  return (
    <form
      action={uploadCbz}
      className="grid gap-3 border border-nv-border bg-surface-raised p-4"
    >
      <input name="seriesId" type="hidden" value={seriesId} />
      <h4 className="font-semibold">CBZ ile yeni bölüm</h4>
      <div className="grid gap-3 sm:grid-cols-4">
        <label className="grid gap-1 text-sm">
          Bölüm no
          <input
            className="min-h-11 border border-nv-border bg-surface px-3"
            name="chapterNumber"
            required
          />
        </label>
        <label className="grid gap-1 text-sm">
          Sıra
          <input
            className="min-h-11 border border-nv-border bg-surface px-3"
            min="0"
            name="sortKey"
            required
            type="number"
          />
        </label>
        <label className="grid gap-1 text-sm">
          Slug
          <input
            className="min-h-11 border border-nv-border bg-surface px-3"
            name="canonicalSlug"
            required
          />
        </label>
        <label className="grid gap-1 text-sm">
          Başlık
          <input
            className="min-h-11 border border-nv-border bg-surface px-3"
            name="title"
          />
        </label>
      </div>
      <label className="grid gap-1 text-sm">
        CBZ dosyası
        <input
          accept=".cbz,application/vnd.comicbook+zip,application/zip"
          className="min-h-11 border border-nv-border bg-surface p-2"
          name="cbz"
          onChange={(event) => void preview(event.target.files?.[0])}
          required
          type="file"
        />
      </label>
      {message ? (
        <p aria-live="polite" className="text-nv-muted-foreground text-sm">
          {message}
        </p>
      ) : null}
      {previews.length ? (
        <div>
          <p className="mb-2 text-sm">
            İlk {previews.length} sayfa · toplam {pageCount}
          </p>
          <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {previews.map((item) => (
              <li className="min-w-0" key={item.name}>
                {item.src ? (
                  // Data URL is returned only by the authenticated preview endpoint.
                  // biome-ignore lint/performance/noImgElement: Next Image does not optimize data URLs
                  <img
                    alt={`Sayfa ${item.pageNumber}: ${item.name}`}
                    className="aspect-[2/3] w-full border border-nv-border bg-surface object-cover"
                    src={item.src}
                  />
                ) : (
                  <div className="flex aspect-[2/3] items-center justify-center border border-nv-border bg-surface text-nv-muted-foreground text-xs">
                    Büyük dosya
                  </div>
                )}
                <p className="truncate text-xs" title={item.name}>
                  {item.pageNumber}. {item.name}
                </p>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
      <button
        className="min-h-11 justify-self-start bg-nv-primary px-4 font-semibold text-nv-primary-foreground hover:bg-nv-primary-hover"
        type="submit"
      >
        Bölüm olarak kaydet
      </button>
    </form>
  )
}
