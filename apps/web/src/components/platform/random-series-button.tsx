"use client"

import { Dices } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export function RandomSeriesButton({
  hrefs,
  label,
}: {
  hrefs: string[]
  label: string
}) {
  const router = useRouter()

  return (
    <button
      className="inline-flex min-h-11 items-center gap-2 rounded-md border border-nv-border bg-surface px-4 font-semibold text-sm hover:bg-surface-raised"
      disabled={!hrefs.length}
      onClick={() => {
        const href = hrefs[Math.floor(Math.random() * hrefs.length)]
        if (href) router.push(`${href}?random=1`)
      }}
      type="button"
    >
      <Dices aria-hidden="true" size={18} />
      {label}
    </button>
  )
}

export function RandomSeriesFloatingButton({
  currentHref,
  hrefs,
  label,
}: {
  currentHref: string
  hrefs: string[]
  label: string
}) {
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    setVisible(
      new URLSearchParams(window.location.search).get("random") === "1",
    )
  }, [])
  if (!visible) return null

  const alternatives = hrefs.filter((href) => href !== currentHref)
  return (
    <button
      aria-label={label}
      className="fixed right-4 bottom-20 z-40 grid size-14 place-items-center rounded-full border border-nv-border bg-nv-primary text-nv-primary-foreground shadow-xl transition-transform hover:rotate-12 hover:scale-105"
      disabled={!alternatives.length}
      onClick={() => {
        const href =
          alternatives[Math.floor(Math.random() * alternatives.length)]
        if (href) router.replace(`${href}?random=1`)
      }}
      title={label}
      type="button"
    >
      <Dices aria-hidden="true" size={22} />
    </button>
  )
}
