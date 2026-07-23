"use client"

import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

const options = [
  { value: "light", label: "Açık tema", icon: Sun },
  { value: "dark", label: "Koyu tema", icon: Moon },
  { value: "system", label: "Sistem teması", icon: Monitor },
] as const

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <output
        aria-label="Tema yükleniyor"
        className="inline-flex size-11 rounded-md border border-nv-border bg-surface"
      />
    )
  }

  const current = options.find((option) => option.value === theme) ?? options[2]
  const Icon = current.icon

  return (
    <button
      aria-label={`${current.label}. Değiştirmek için tıklayın.`}
      className="inline-flex size-11 items-center justify-center rounded-md border border-nv-border bg-surface text-foreground transition hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-ring"
      onClick={() => {
        const index = options.findIndex((option) => option.value === theme)
        setTheme(options[(index + 1) % options.length]?.value ?? "system")
      }}
      type="button"
    >
      <Icon aria-hidden="true" size={19} />
    </button>
  )
}
