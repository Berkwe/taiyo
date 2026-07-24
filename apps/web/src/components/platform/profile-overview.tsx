"use client"

import { Camera, LogIn, UserPlus } from "lucide-react"
import Link from "next/link"
import { useRef, useState } from "react"

export function ProfileOverview({
  authenticated,
  avatar,
  canUploadAvatar,
  email,
  name,
  role,
}: {
  authenticated: boolean
  avatar?: string | null
  canUploadAvatar: boolean
  email?: string | null
  name: string
  role: string
}) {
  const input = useRef<HTMLInputElement>(null)
  const [currentAvatar, setCurrentAvatar] = useState(avatar)
  const [status, setStatus] = useState("")

  async function upload(file: File | undefined) {
    if (!file) return
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setStatus("Yalnızca JPEG, PNG veya WebP yükleyebilirsiniz.")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setStatus("Profil görseli en fazla 5 MB olabilir.")
      return
    }
    const body = new FormData()
    body.set("avatar", file)
    setStatus("Görsel güvenlik kontrolünden geçiriliyor…")
    const response = await fetch("/api/profile/avatar", {
      method: "POST",
      body,
    })
    const result = (await response.json()) as {
      error?: string
      image?: string
    }
    if (!response.ok || !result.image) {
      setStatus(result.error ?? "Profil görseli yüklenemedi.")
      return
    }
    setCurrentAvatar(`${result.image}?v=${Date.now()}`)
    setStatus("Profil görseli güncellendi.")
  }

  return (
    <section className="mb-10 grid gap-6 border border-nv-border bg-surface p-5 sm:grid-cols-[auto_1fr] sm:items-center">
      <div className="relative size-28 overflow-hidden rounded-full border border-nv-border bg-surface-raised">
        {currentAvatar ? (
          // biome-ignore lint/performance/noImgElement: user-controlled API URL updates immediately after upload
          <img
            alt={`${name} profil görseli`}
            className="size-full object-cover"
            src={currentAvatar}
          />
        ) : (
          <span className="grid size-full place-items-center font-bold text-4xl text-nv-primary">
            {name.slice(0, 1).toLocaleUpperCase("tr")}
          </span>
        )}
        {canUploadAvatar ? (
          <button
            aria-label="Profil görselini değiştir"
            className="absolute inset-x-0 bottom-0 flex h-9 items-center justify-center bg-overlay text-reader-foreground"
            onClick={() => input.current?.click()}
            type="button"
          >
            <Camera size={18} />
          </button>
        ) : null}
      </div>
      <div>
        <p className="font-semibold text-nv-primary text-sm uppercase tracking-[.12em]">
          {role}
        </p>
        <h1 className="mt-1 font-bold text-3xl">{name}</h1>
        {email ? (
          <p className="mt-1 text-nv-muted-foreground text-sm">{email}</p>
        ) : null}
        {!authenticated ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              className="inline-flex min-h-11 items-center gap-2 bg-nv-primary px-4 font-semibold text-nv-primary-foreground"
              href="/auth/sign-in"
            >
              <LogIn size={17} /> Giriş yap
            </Link>
            <Link
              className="inline-flex min-h-11 items-center gap-2 border border-nv-border px-4 font-semibold"
              href="/auth/sign-up"
            >
              <UserPlus size={17} /> Kayıt ol
            </Link>
          </div>
        ) : null}
        {status ? (
          <p
            aria-live="polite"
            className="mt-3 text-nv-muted-foreground text-sm"
          >
            {status}
          </p>
        ) : null}
      </div>
      {canUploadAvatar ? (
        <input
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => {
            void upload(event.target.files?.[0])
            event.currentTarget.value = ""
          }}
          ref={input}
          type="file"
        />
      ) : null}
    </section>
  )
}
