"use client"

import { useEffect, useRef, useState } from "react"
export interface ReaderSelectionResult {
  file: File
  previewUrl: string
  metadata: {
    startPage: number
    endPage: number
    storageKeys: string[]
    startY: number
    endY: number
    scrollY: number
  }
}

const minimumHeight = 500
const maximumAttachmentBytes = 5 * 1024 * 1024

function encodeSelection(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  )
}

async function loadSelectionImage(image: HTMLImageElement) {
  const source = new Image()
  source.decoding = "async"
  source.src = image.currentSrc || image.src
  await source.decode()
  return source
}

export function ReaderSelection({
  onCancel,
  onComplete,
}: {
  onCancel: () => void
  onComplete: (result: ReaderSelectionResult) => void
}) {
  const [bounds, setBounds] = useState({
    top: 0,
    bottom: document.documentElement.scrollHeight,
    left: 0,
    width: window.innerWidth,
  })
  const [overlayOrigin, setOverlayOrigin] = useState({ top: 0, left: 0 })
  const [startY, setStartY] = useState(0)
  const [endY, setEndY] = useState(minimumHeight)
  const [dragging, setDragging] = useState<"start" | "end" | null>(null)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState("")
  const startYRef = useRef(startY)
  const endYRef = useRef(endY)
  const selectionBoxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    startYRef.current = startY
    endYRef.current = endY
  }, [endY, startY])

  useEffect(() => {
    const measure = (initialize = false) => {
      const pages = [
        ...document.querySelectorAll<HTMLElement>("[data-page-number]"),
      ]
      const first = pages[0]
      const last = pages.at(-1)
      if (!first || !last) return
      const firstRect = first.getBoundingClientRect()
      const lastRect = last.getBoundingClientRect()
      const readerRect = first
        .closest<HTMLElement>(".reader-shell")
        ?.getBoundingClientRect()
      const top = firstRect.top + window.scrollY
      const bottom = lastRect.bottom + window.scrollY
      setOverlayOrigin({
        top: (readerRect?.top ?? 0) + window.scrollY,
        left: (readerRect?.left ?? 0) + window.scrollX,
      })
      setBounds({
        top,
        bottom,
        left: firstRect.left,
        width: firstRect.width,
      })
      if (initialize) {
        const visibleStart = Math.min(
          Math.max(window.scrollY + 80, top),
          Math.max(top, bottom - minimumHeight),
        )
        const visibleEnd = Math.min(
          bottom,
          Math.max(
            visibleStart + minimumHeight,
            window.scrollY + window.innerHeight - 160,
          ),
        )
        startYRef.current = visibleStart
        endYRef.current = visibleEnd
        setStartY(visibleStart)
        setEndY(visibleEnd)
      } else {
        setStartY((current) => {
          const next = Math.max(top, Math.min(current, bottom - minimumHeight))
          startYRef.current = next
          return next
        })
        setEndY((current) => {
          const next = Math.min(bottom, Math.max(current, top + minimumHeight))
          endYRef.current = next
          return next
        })
      }
    }
    measure(true)
    const onResize = () => measure()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  useEffect(() => {
    if (!dragging) return
    let frame = 0
    let pointerY: number | null = null
    const updateHandle = (clientY: number) => {
      const y = Math.min(
        bounds.bottom,
        Math.max(bounds.top, clientY + window.scrollY),
      )
      if (dragging === "start")
        setStartY(() => {
          const next = Math.max(
            bounds.top,
            Math.min(y, endYRef.current - minimumHeight),
          )
          startYRef.current = next
          return next
        })
      else
        setEndY(() => {
          const next = Math.max(
            startYRef.current + minimumHeight,
            Math.min(y, bounds.bottom),
          )
          endYRef.current = next
          return next
        })
    }
    const move = (event: PointerEvent) => {
      pointerY = event.clientY
      updateHandle(event.clientY)
    }
    const tick = () => {
      if (pointerY !== null) {
        const edge = 80
        const readerTop = Math.max(0, bounds.top)
        const readerBottom = bounds.bottom
        let delta = 0
        if (pointerY < edge && window.scrollY > readerTop) {
          delta = -Math.max(4, (edge - pointerY) / 5)
        } else if (
          pointerY > window.innerHeight - edge &&
          pointerY + window.scrollY < readerBottom
        ) {
          delta = Math.max(4, (pointerY - (window.innerHeight - edge)) / 5)
        }
        if (delta) {
          const before = window.scrollY
          window.scrollBy({ top: delta, behavior: "instant" })
          if (window.scrollY !== before) updateHandle(pointerY)
        }
      }
      frame = requestAnimationFrame(tick)
    }
    const stop = () => {
      cancelAnimationFrame(frame)
      setDragging(null)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", stop, { once: true })
    window.addEventListener("pointercancel", stop, { once: true })
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", stop)
      window.removeEventListener("pointercancel", stop)
    }
  }, [bounds, dragging])

  async function capture() {
    setWorking(true)
    setError("")
    try {
      const selectionRect = selectionBoxRef.current?.getBoundingClientRect()
      if (!selectionRect) throw new Error("Seçim alanının konumu okunamadı.")
      const selectedStartY = Math.max(
        bounds.top,
        Math.min(
          selectionRect.top + window.scrollY,
          bounds.bottom - minimumHeight,
        ),
      )
      const selectedEndY = Math.min(
        bounds.bottom,
        Math.max(
          selectionRect.bottom + window.scrollY,
          selectedStartY + minimumHeight,
        ),
      )
      const elements = [
        ...document.querySelectorAll<HTMLElement>("[data-page-number]"),
      ]
      const candidates = elements.flatMap((element) => {
        const rect = element.getBoundingClientRect()
        const top = rect.top + window.scrollY
        const bottom = top + rect.height
        const intersectionTop = Math.max(selectedStartY, top)
        const intersectionBottom = Math.min(selectedEndY, bottom)
        const image = element.querySelector("img")
        if (!image || intersectionBottom <= intersectionTop) return []
        return [
          { element, image, rect, top, intersectionTop, intersectionBottom },
        ]
      })
      const intersections = (
        await Promise.all(
          candidates.map(async (candidate) => {
            try {
              return {
                ...candidate,
                image: await loadSelectionImage(candidate.image),
              }
            } catch {
              return null
            }
          }),
        )
      ).filter((item) => item !== null)
      if (!intersections.length)
        throw new Error("Seçimde yüklenmiş görsel yok.")
      const cssHeight = selectedEndY - selectedStartY
      const outputWidth = 1080
      const outputHeight = Math.max(
        1,
        Math.min(8000, Math.round((cssHeight / bounds.width) * outputWidth)),
      )
      const scale = outputHeight / cssHeight
      const canvas = document.createElement("canvas")
      canvas.width = outputWidth
      canvas.height = outputHeight
      const context = canvas.getContext("2d")
      if (!context) throw new Error("Görsel alanı oluşturulamadı.")
      context.fillStyle =
        getComputedStyle(document.documentElement)
          .getPropertyValue("--nv-reader-background")
          .trim() || "black"
      context.fillRect(0, 0, canvas.width, canvas.height)
      for (const item of intersections) {
        const visibleTop = item.intersectionTop
        const visibleBottom = item.intersectionBottom
        const sourceY =
          ((visibleTop - item.top) / item.rect.height) *
          item.image.naturalHeight
        const sourceHeight =
          ((visibleBottom - visibleTop) / item.rect.height) *
          item.image.naturalHeight
        const destinationY = (visibleTop - selectedStartY) * scale
        const destinationHeight = (visibleBottom - visibleTop) * scale
        context.drawImage(
          item.image,
          0,
          sourceY,
          item.image.naturalWidth,
          sourceHeight,
          0,
          destinationY,
          outputWidth,
          destinationHeight,
        )
      }
      let blob = await encodeSelection(canvas, 0.82)
      if (blob && blob.size > maximumAttachmentBytes)
        blob = await encodeSelection(canvas, 0.6)
      if (!blob) throw new Error("Seçim görsele dönüştürülemedi.")
      if (blob.size > maximumAttachmentBytes)
        throw new Error("Seçim çok büyük. Lütfen daha kısa bir alan seçin.")
      const startPage = Number(
        intersections[0]!.element.dataset.pageNumber ?? 1,
      )
      const endPage = Number(
        intersections.at(-1)!.element.dataset.pageNumber ?? startPage,
      )
      onComplete({
        file: new File([blob], "reader-selection.jpg", { type: "image/jpeg" }),
        previewUrl: URL.createObjectURL(blob),
        metadata: {
          startPage,
          endPage,
          storageKeys: intersections
            .map((item) => item.element.dataset.storageKey ?? "")
            .filter(Boolean),
          startY: selectedStartY,
          endY: selectedEndY,
          scrollY: window.scrollY,
        },
      })
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Seçilen alan görsele dönüştürülemedi.",
      )
    } finally {
      setWorking(false)
    }
  }

  return (
    <section
      aria-label="Bölümden alan seçimi"
      className="absolute inset-0 z-[130]"
    >
      <div
        className="pointer-events-none absolute border-nv-primary border-y-2"
        data-reader-selection-box
        ref={selectionBoxRef}
        style={{
          left: bounds.left - overlayOrigin.left,
          width: bounds.width,
          top: startY - overlayOrigin.top,
          height: endY - startY,
          boxShadow: "0 0 0 99999px var(--nv-overlay)",
        }}
      />
      {[
        ["start", startY],
        ["end", endY],
      ].map(([name, y]) => (
        <button
          aria-label={
            name === "start" ? "Üst seçim çubuğu" : "Alt seçim çubuğu"
          }
          className="-translate-y-1/2 absolute h-8 cursor-row-resize touch-none bg-nv-primary/90"
          key={name}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId)
            setDragging(name as "start" | "end")
          }}
          style={{
            top: Number(y) - overlayOrigin.top,
            left: bounds.left - overlayOrigin.left,
            width: bounds.width,
          }}
          type="button"
        >
          <span className="mx-auto block h-1 w-20 rounded bg-nv-primary-foreground" />
        </button>
      ))}
      <div className="fixed right-0 bottom-0 left-0 z-[140] flex justify-center gap-3 border-nv-border border-t bg-surface p-3 pb-[max(.75rem,env(safe-area-inset-bottom))]">
        <button
          className="min-h-12 border border-nv-border px-6 font-semibold"
          onClick={onCancel}
          type="button"
        >
          İptal
        </button>
        <button
          className="min-h-12 bg-nv-primary px-6 font-semibold text-nv-primary-foreground"
          disabled={working}
          onClick={() => void capture()}
          type="button"
        >
          {working ? "Hazırlanıyor…" : "Ekle"}
        </button>
      </div>
      <p className="-translate-x-1/2 fixed top-4 left-1/2 z-[140] bg-overlay px-4 py-2 text-center text-reader-foreground text-sm">
        {error || "Çubukları sürükleyin; seçim en az 500 piksel olmalıdır."}
      </p>
    </section>
  )
}
