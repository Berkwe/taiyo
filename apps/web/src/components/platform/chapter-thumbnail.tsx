"use client"

import { ImageOff } from "lucide-react"
import Image from "next/image"
import { useState } from "react"

export function ChapterThumbnail({
  alt,
  src,
}: {
  alt: string
  src?: string | null
}) {
  const [loaded, setLoaded] = useState(false)
  return (
    <span className="relative block aspect-[4/3] w-20 shrink-0 overflow-hidden border border-nv-border bg-surface-raised sm:w-28">
      {!src ? (
        <span className="absolute inset-0 grid place-items-center text-nv-muted-foreground">
          <ImageOff aria-hidden="true" size={20} strokeWidth={1.5} />
          <span className="sr-only">{alt}</span>
        </span>
      ) : null}
      {src && !loaded ? (
        <span
          aria-hidden="true"
          className="absolute inset-0 animate-pulse bg-surface-muted"
        />
      ) : null}
      {src ? (
        <Image
          alt={alt}
          className={`object-cover transition-opacity ${loaded ? "opacity-100" : "opacity-0"}`}
          fill
          loading="lazy"
          onLoad={() => setLoaded(true)}
          sizes="(max-width: 640px) 80px, 112px"
          src={src}
          unoptimized={src.startsWith("/api/storage/")}
        />
      ) : null}
    </span>
  )
}
