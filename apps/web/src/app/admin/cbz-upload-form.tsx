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

interface ExistingChapter {
  id: string
  chapterNumber: string
  sortKey: number
  canonicalSlug: string
  title: string
  sources: Array<{
    id: string
    displayLabel: string | null
    language: string
    platform: string
  }>
}

export function CbzUploadForm({
  chapter,
  seriesId,
}: {
  chapter?: ExistingChapter
  seriesId: string
}) {
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
      {chapter ? (
        <>
          <input name="existingChapterId" type="hidden" value={chapter.id} />
          <input
            name="chapterNumber"
            type="hidden"
            value={chapter.chapterNumber}
          />
          <input name="sortKey" type="hidden" value={chapter.sortKey} />
          <input
            name="canonicalSlug"
            type="hidden"
            value={chapter.canonicalSlug}
          />
          <input name="title" type="hidden" value={chapter.title} />
        </>
      ) : null}
      <h4 className="font-semibold">
        {chapter
          ? `Bölüm ${chapter.chapterNumber} için kaynak/çeviri yükle`
          : "CBZ ile yeni bölüm"}
      </h4>
      {!chapter ? (
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
      ) : null}
      <fieldset className="grid gap-3 border border-nv-border p-3 sm:grid-cols-3">
        <legend className="px-1 font-semibold text-sm">
          Kaynak ve çeviri sürümü
        </legend>
        {chapter?.sources.length ? (
          <label className="grid gap-1 text-sm sm:col-span-3">
            Mevcut kaynak sürümüne bağla
            <select
              className="min-h-11 border border-nv-border bg-surface px-3"
              defaultValue=""
              name="existingSourceId"
            >
              <option value="">Yeni kaynak sürümü oluştur</option>
              {chapter.sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.displayLabel ||
                    `${source.language.toUpperCase()} · otomatik etiket`}{" "}
                  ({source.platform})
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="grid gap-1 text-sm">
          Gerçek platform (yalnız yönetim)
          <select
            className="min-h-11 border border-nv-border bg-surface px-3"
            defaultValue="OTHER"
            name="platform"
          >
            <option value="NAVER">Naver</option>
            <option value="WEBTOONS">Webtoons</option>
            <option value="KAKAO">Kakao</option>
            <option value="OTHER">Diğer</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Kaynak dili
          <select
            className="min-h-11 border border-nv-border bg-surface px-3"
            defaultValue="en"
            name="sourceLanguage"
          >
            <option value="en">İngilizce</option>
            <option value="ko">Korece</option>
            <option value="tr">Türkçe</option>
            <option value="ja">Japonca</option>
            <option value="zh">Çince</option>
            <option value="de">Almanca</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Anonim kaynak etiketi (isteğe bağlı)
          <input
            className="min-h-11 border border-nv-border bg-surface px-3"
            name="displayLabel"
            placeholder="Boşsa İngilizce-1 gibi üretilir"
          />
        </label>
        <label className="grid gap-1 text-sm sm:col-span-2">
          Kullanıcıya gösterilecek açıklama
          <input
            className="min-h-11 border border-nv-border bg-surface px-3"
            defaultValue="Kaliteli, insan eliyle hazırlanmış İngilizce kaynak."
            name="sourceDescription"
            required
          />
        </label>
        <label className="grid gap-1 text-sm">
          Kaynak önceliği
          <input
            className="min-h-11 border border-nv-border bg-surface px-3"
            defaultValue="100"
            min="0"
            name="sourcePriority"
            type="number"
          />
        </label>
        <label className="grid gap-1 text-sm">
          Kaynak URL (yalnız yönetim)
          <input
            className="min-h-11 border border-nv-border bg-surface px-3"
            name="sourceUrl"
            type="url"
          />
        </label>
        <label className="grid gap-1 text-sm">
          Harici kaynak ID (yalnız yönetim)
          <input
            className="min-h-11 border border-nv-border bg-surface px-3"
            name="externalId"
          />
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input defaultChecked name="isDefault" type="checkbox" />
          Varsayılan kaynak
        </label>
        <label className="grid gap-1 text-sm">
          Çıktı dili
          <select
            className="min-h-11 border border-nv-border bg-surface px-3"
            defaultValue="tr"
            name="targetLanguage"
          >
            <option value="tr">TR</option>
            <option value="en">EN</option>
            <option value="ko">KO</option>
            <option value="de">DE</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Çeviri kalitesi
          <select
            className="min-h-11 border border-nv-border bg-surface px-3"
            defaultValue="BALANCED"
            name="qualityTier"
          >
            <option value="BALANCED">Dengeli</option>
            <option value="PREMIUM">Premium</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Pipeline sürümü
          <input
            className="min-h-11 border border-nv-border bg-surface px-3"
            defaultValue="v1"
            name="pipelineVersion"
            required
          />
        </label>
      </fieldset>
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
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
            <p>
              İlk {previews.length} sayfa · toplam {pageCount}
            </p>
            <label className="inline-flex items-center gap-2">
              <input defaultChecked name="automaticThumbnail" type="checkbox" />
              İlk paneli otomatik thumbnail yap
            </label>
            {chapter ? (
              <label className="inline-flex items-center gap-2">
                <input name="replaceThumbnail" type="checkbox" />
                Mevcut thumbnail’i bu seçimle değiştir
              </label>
            ) : null}
          </div>
          <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {previews.map((item) => (
              <li className="min-w-0" key={item.name}>
                <label className="grid cursor-pointer gap-1">
                  {item.src ? (
                    // Data URL is returned only by the authenticated preview endpoint.
                    // biome-ignore lint/performance/noImgElement: Next Image does not optimize data URLs
                    <img
                      alt={`Sayfa ${item.pageNumber}: ${item.name}`}
                      className="aspect-[2/3] w-full border border-nv-border bg-surface object-cover"
                      src={item.src}
                    />
                  ) : (
                    <span className="flex aspect-[2/3] items-center justify-center border border-nv-border bg-surface text-nv-muted-foreground text-xs">
                      Büyük dosya
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <input
                      defaultChecked={item.pageNumber === 1}
                      name="thumbnailPage"
                      type="radio"
                      value={item.pageNumber}
                    />
                    Thumbnail
                  </span>
                </label>
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
