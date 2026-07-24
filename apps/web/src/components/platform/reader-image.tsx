"use client"

import { AlertCircle, RotateCcw } from "lucide-react"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import type { ReleasePage } from "~/features/platform/domain"

const messages = [
  "Senin için görseli hazırlıyoruz 👍🏿",
  "Bekle biraz, değecek.",
  "Son dokunuşlar yapılıyor.",
  "Neredeyse hazır.",
]

export function ReaderImage({
  index,
  onVisible,
  page,
}: {
  index: number
  onVisible: (index: number) => void
  page: ReleasePage
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [retry, setRetry] = useState(0)
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [message, setMessage] = useState(messages[0])

  useEffect(() => {
    setMessage(
      messages[Math.floor(Math.random() * messages.length)] ?? messages[0],
    )
  }, [])

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) onVisible(index)
      },
      { rootMargin: "-35% 0px -35% 0px", threshold: 0.01 },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [index, onVisible])

  return (
    <div
      className="relative mx-auto w-full max-w-[1200px] overflow-hidden bg-reader-background"
      data-page-number={page.pageNumber}
      data-storage-key={page.storageKey ?? ""}
      id={`reader-page-${index + 1}`}
      ref={ref}
      style={{ aspectRatio: `${page.width} / ${page.height}` }}
    >
      {!loaded && !failed ? (
        <div className="absolute inset-0 z-10 grid place-content-center gap-3 bg-reader-background p-6 text-center text-reader-foreground transition-opacity">
          <span
            aria-hidden="true"
            className="mx-auto size-7 animate-spin rounded-full border-2 border-nv-border border-t-nv-primary"
          />
          <p aria-live="polite">{message}</p>
        </div>
      ) : null}
      {failed ? (
        <div className="absolute inset-0 z-20 grid place-content-center gap-4 p-6 text-center text-reader-foreground">
          <AlertCircle className="mx-auto" />
          <p>Görsel yüklenemedi.</p>
          <button
            className="mx-auto inline-flex min-h-11 items-center gap-2 border border-nv-border px-4"
            onClick={() => {
              setFailed(false)
              setLoaded(false)
              setRetry((value) => value + 1)
            }}
            type="button"
          >
            <RotateCcw size={17} /> Tekrar dene
          </button>
        </div>
      ) : (
        <Image
          alt={page.alt}
          className={`pointer-events-none object-contain transition-opacity duration-200 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          draggable={false}
          fill
          key={retry}
          loading={index === 0 ? "eager" : "lazy"}
          onError={() => setFailed(true)}
          onLoad={() => setLoaded(true)}
          priority={index === 0}
          sizes="(max-width: 1200px) 100vw, 1200px"
          src={page.src}
        />
      )}
    </div>
  )
}
