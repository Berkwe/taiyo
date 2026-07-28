"use client"

import { ImagePlus, Maximize2, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type {
  Chapter,
  ChapterRelease,
  Series,
} from "~/features/platform/domain"
import { getProfile } from "~/features/platform/fixtures"
import {
  type PopupMotionState,
  useAnimatedPresence,
} from "~/hooks/use-animated-presence"
import type { ReaderSelectionResult } from "./reader-selection"

const reasonOptions = {
  CHAPTER: [
    ["chapter_not_loading", "Bölüm yüklenmiyor"],
    ["missing_or_wrong_chapter", "Eksik/hatalı bölüm"],
    ["wrong_chapter_number", "Bölüm numarası yanlış"],
    ["other", "Diğer"],
  ],
  PANEL: [
    ["image_not_loading", "Görsel yüklenmiyor"],
    ["missing_or_broken_image", "Eksik veya bozuk görsel"],
    ["wrong_order", "Yanlış sıralama"],
    ["translation_error", "Çeviri hatası"],
    ["typesetting_error", "Yazı hizalama/font sorunu"],
    ["source_text_remaining", "Silinmemiş kaynak yazı"],
    ["other", "Diğer"],
  ],
} as const

export function ReaderReportDialog({
  authenticated,
  chapter,
  motionState,
  onClose,
  onSelectFromReader,
  release,
  selection,
  series,
}: {
  authenticated: boolean
  chapter: Chapter
  motionState: PopupMotionState
  onClose: () => void
  onSelectFromReader: () => void
  release: ChapterRelease
  selection: ReaderSelectionResult | null
  series: Series
}) {
  const [type, setType] = useState<"CHAPTER" | "PANEL">("CHAPTER")
  const [reason, setReason] = useState("")
  const [attachment, setAttachment] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(
    selection?.previewUrl ?? null,
  )
  const [status, setStatus] = useState("")
  const [previewOpen, setPreviewOpen] = useState(false)
  const previewPresence = useAnimatedPresence(previewOpen)
  const [usingReaderSelection, setUsingReaderSelection] = useState(
    Boolean(selection),
  )
  const fileInput = useRef<HTMLInputElement>(null)
  const profileSlug = getProfile(release.profileId)?.slug ?? release.profileId

  useEffect(() => {
    const root = document.documentElement
    const body = document.body
    const previousRootOverflow = root.style.overflow
    const previousRootOverscroll = root.style.overscrollBehavior
    const previousBodyOverflow = body.style.overflow
    const previousBodyOverscroll = body.style.overscrollBehavior
    root.style.overflow = "hidden"
    root.style.overscrollBehavior = "none"
    body.style.overflow = "hidden"
    body.style.overscrollBehavior = "none"
    return () => {
      root.style.overflow = previousRootOverflow
      root.style.overscrollBehavior = previousRootOverscroll
      body.style.overflow = previousBodyOverflow
      body.style.overscrollBehavior = previousBodyOverscroll
    }
  }, [])

  useEffect(() => {
    if (selection) {
      setType("PANEL")
      setAttachment(selection.file)
      setPreview(selection.previewUrl)
      setUsingReaderSelection(true)
    }
  }, [selection])

  useEffect(
    () => () => {
      if (preview && preview !== selection?.previewUrl)
        URL.revokeObjectURL(preview)
    },
    [preview, selection?.previewUrl],
  )

  async function submit(formData: FormData) {
    if (!authenticated) {
      setStatus("Rapor göndermek için giriş yapmalısınız.")
      return
    }
    if (!reason) {
      setStatus("Bir sebep seçin.")
      return
    }
    if (type === "PANEL" && !attachment) {
      setStatus("Cihazdan bir görsel ekleyin veya bölümden alan seçin.")
      return
    }
    formData.set("type", type)
    formData.set("reasons", JSON.stringify([reason]))
    formData.set(
      "context",
      JSON.stringify({
        seriesId: series.id,
        seriesSlug: series.slug,
        chapterId: chapter.id,
        chapterNumber: chapter.number,
        profileSlug,
        targetLanguage: release.targetLanguage,
        ...(selection && usingReaderSelection
          ? { selection: selection.metadata }
          : {}),
      }),
    )
    if (attachment) formData.set("attachment", attachment)
    setStatus("Gönderiliyor…")
    const response = await fetch("/api/reports", {
      method: "POST",
      body: formData,
    })
    const result = (await response.json()) as { error?: string }
    if (!response.ok) {
      setStatus(result.error ?? "Rapor gönderilemedi.")
      return
    }
    setStatus("Rapor alındı. Teşekkürler.")
    window.setTimeout(onClose, 900)
  }

  return (
    <div
      aria-labelledby="report-title"
      aria-modal="true"
      className="fixed inset-0 z-[130] grid place-items-center overscroll-none bg-overlay p-3"
      data-popup-backdrop
      data-popup-motion={motionState}
      role="dialog"
    >
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto overscroll-contain border border-nv-border bg-surface p-5 shadow-2xl"
        data-popup-surface
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold text-xl" id="report-title">
            İçerik bildir
          </h2>
          <button
            aria-label="Rapor penceresini kapat"
            className="inline-flex size-11 items-center justify-center border border-nv-border"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" />
          </button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          {(["CHAPTER", "PANEL"] as const).map((option) => (
            <button
              aria-pressed={type === option}
              className="min-h-11 border border-nv-border px-3 font-semibold aria-pressed:bg-nv-primary aria-pressed:text-nv-primary-foreground"
              onClick={() => {
                setType(option)
                setReason("")
                setStatus("")
              }}
              type="button"
              key={option}
            >
              {option === "CHAPTER" ? "Bölümü bildir" : "Paneli bildir"}
            </button>
          ))}
        </div>
        <form action={(data) => void submit(data)} className="mt-5 grid gap-5">
          <fieldset>
            <legend className="mb-2 font-semibold">Bir sebep seçin</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {reasonOptions[type].map(([value, label]) => (
                <label
                  className="flex min-h-11 items-center gap-3 border border-nv-border p-3"
                  key={value}
                >
                  <input
                    checked={reason === value}
                    name="reason"
                    onChange={() => setReason(value)}
                    type="radio"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          {type === "PANEL" ? (
            <div>
              <p className="mb-2 font-semibold">Görsel eki</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  className="flex min-h-12 items-center justify-center gap-2 border border-nv-border px-3 font-semibold"
                  onClick={() => fileInput.current?.click()}
                  type="button"
                >
                  <ImagePlus aria-hidden="true" size={18} />
                  Cihazdan görsel yükle
                </button>
                <input
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (!file) return
                    if (
                      !["image/jpeg", "image/png", "image/webp"].includes(
                        file.type,
                      )
                    ) {
                      setStatus(
                        "Yalnızca JPEG, PNG veya WebP ekleyebilirsiniz.",
                      )
                      event.currentTarget.value = ""
                      return
                    }
                    if (file.size > 5 * 1024 * 1024) {
                      setStatus("Ek görsel en fazla 5 MB olabilir.")
                      event.currentTarget.value = ""
                      return
                    }
                    setAttachment(file)
                    setUsingReaderSelection(false)
                    setStatus("")
                    setPreview(URL.createObjectURL(file))
                  }}
                  ref={fileInput}
                  type="file"
                />
                <button
                  className="min-h-12 border border-nv-border px-3 font-semibold"
                  onClick={onSelectFromReader}
                  type="button"
                >
                  Bölümden seç
                </button>
              </div>
              {preview ? (
                <div
                  className="mt-3 border border-nv-border bg-surface-raised p-3"
                  data-selection-pages={
                    selection && usingReaderSelection
                      ? `${selection.metadata.startPage}-${selection.metadata.endPage}`
                      : undefined
                  }
                  data-selection-height={
                    selection && usingReaderSelection
                      ? selection.metadata.endY - selection.metadata.startY
                      : undefined
                  }
                  data-selection-start={
                    selection && usingReaderSelection
                      ? selection.metadata.startY
                      : undefined
                  }
                  data-selection-end={
                    selection && usingReaderSelection
                      ? selection.metadata.endY
                      : undefined
                  }
                >
                  <button
                    aria-label="Eki büyük önizlemede aç"
                    className="group relative block w-full"
                    onClick={() => setPreviewOpen(true)}
                    type="button"
                  >
                    {/* biome-ignore lint/performance/noImgElement: object URL preview */}
                    <img
                      alt="Rapor eki önizlemesi"
                      className="mx-auto max-h-72 object-contain"
                      src={preview}
                    />
                    <Maximize2 className="absolute right-2 bottom-2 rounded bg-overlay p-1 text-reader-foreground" />
                  </button>
                  <button
                    className="mt-2 min-h-11 w-full border border-nv-border"
                    onClick={() => {
                      setAttachment(null)
                      setPreview(null)
                      setUsingReaderSelection(false)
                      if (fileInput.current) fileInput.current.value = ""
                    }}
                    type="button"
                  >
                    Eki kaldır
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
          <label className="grid gap-2 font-semibold">
            Özel açıklama
            {reason === "other" ? (
              <span className="font-normal text-danger"> (zorunlu)</span>
            ) : null}
            <textarea
              className="min-h-28 border border-nv-border bg-background p-3 font-normal"
              maxLength={2000}
              name="description"
              placeholder="İsteğe bağlı"
              required={reason === "other"}
            />
          </label>
          <p aria-live="polite" className="text-nv-muted-foreground text-sm">
            {status}
          </p>
          <button
            className="min-h-12 bg-nv-primary px-5 font-semibold text-nv-primary-foreground"
            type="submit"
          >
            Raporu gönder
          </button>
        </form>
      </div>
      {previewPresence.rendered && preview ? (
        <button
          aria-label="Büyük önizlemeyi kapat"
          className="fixed inset-0 z-[100] grid cursor-zoom-out place-items-center bg-overlay p-4"
          data-popup-backdrop
          data-popup-motion={previewPresence.motionState}
          onClick={() => setPreviewOpen(false)}
          type="button"
        >
          {/* biome-ignore lint/performance/noImgElement: object URL preview */}
          <img
            alt="Rapor eki büyük önizlemesi"
            className="max-h-[90vh] max-w-[92vw] border border-nv-border bg-surface object-contain shadow-2xl"
            data-popup-surface
            src={preview}
          />
        </button>
      ) : null}
    </div>
  )
}
