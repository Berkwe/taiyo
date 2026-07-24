"use client"

import { authClient } from "@taiyomoe/auth/client"
import { KeyRound, Mail, Save, Settings } from "lucide-react"
import { useState } from "react"

const inputClass =
  "min-h-11 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-ring"

export function ProfileSettings({
  about,
  city,
  email,
  locale,
  name,
  preview = false,
}: {
  about?: string | null
  city?: string | null
  email: string
  locale: "tr" | "en"
  name: string
  preview?: boolean
}) {
  const tr = locale === "tr"
  const [profileStatus, setProfileStatus] = useState("")
  const [emailStatus, setEmailStatus] = useState("")
  const [passwordStatus, setPasswordStatus] = useState("")

  return (
    <section className="mb-12 border border-nv-border bg-surface p-5">
      <h2 className="flex items-center gap-2 font-bold text-2xl">
        <Settings size={22} />
        {tr ? "Profil ayarları" : "Profile settings"}
      </h2>
      {preview ? (
        <p className="mt-3 border border-nv-border bg-nv-primary-soft p-3 text-sm">
          {tr
            ? "Debug hesabı önizlemesi: değişiklikler yalnız bu ekranda gösterilir ve gerçek hesaba kaydedilmez."
            : "Debug account preview: changes are shown only on this screen and are not saved to a real account."}
        </p>
      ) : null}
      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        <form
          className="grid content-start gap-3"
          onSubmit={async (event) => {
            event.preventDefault()
            if (preview) {
              setProfileStatus(
                tr
                  ? "Mock profil önizlemesi güncellendi."
                  : "Mock profile preview updated.",
              )
              return
            }
            const values = new FormData(event.currentTarget)
            setProfileStatus(tr ? "Kaydediliyor…" : "Saving…")
            const response = await fetch("/api/profile/settings", {
              method: "PUT",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                name: values.get("name"),
                about: values.get("about"),
                city: values.get("city"),
              }),
            })
            const result = (await response.json()) as { error?: string }
            setProfileStatus(
              response.ok
                ? tr
                  ? "Profil güncellendi."
                  : "Profile updated."
                : result.error || (tr ? "Kaydedilemedi." : "Could not save."),
            )
          }}
        >
          <h3 className="font-semibold">{tr ? "Görünüm" : "Public profile"}</h3>
          <label className="grid gap-1 text-sm">
            {tr ? "Görünen ad" : "Display name"}
            <input
              autoComplete="name"
              className={inputClass}
              defaultValue={name}
              name="name"
              required
            />
          </label>
          <label className="grid gap-1 text-sm">
            {tr ? "Şehir" : "City"}
            <input
              className={inputClass}
              defaultValue={city ?? ""}
              name="city"
            />
          </label>
          <label className="grid gap-1 text-sm">
            {tr ? "Hakkımda" : "About"}
            <textarea
              className={`${inputClass} min-h-28 py-3`}
              defaultValue={about ?? ""}
              maxLength={500}
              name="about"
            />
          </label>
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-nv-primary px-4 font-semibold text-nv-primary-foreground"
            type="submit"
          >
            <Save size={17} /> {tr ? "Kaydet" : "Save"}
          </button>
          <p aria-live="polite" className="text-nv-muted-foreground text-sm">
            {profileStatus}
          </p>
        </form>

        <form
          className="grid content-start gap-3"
          onSubmit={async (event) => {
            event.preventDefault()
            if (preview) {
              setEmailStatus(
                tr
                  ? "Mock hesapta e-posta gönderimi yapılmaz."
                  : "Email is not sent for a mock account.",
              )
              return
            }
            const values = new FormData(event.currentTarget)
            const newEmail = String(values.get("email") ?? "")
            setEmailStatus(tr ? "İstek gönderiliyor…" : "Sending request…")
            const result = await authClient.changeEmail({
              newEmail,
              callbackURL: window.location.href,
            })
            setEmailStatus(
              result.error
                ? result.error.message ||
                    (tr
                      ? "E-posta değiştirilemedi."
                      : "Email could not be changed.")
                : tr
                  ? "Doğrulama bağlantısı yeni e-posta adresine gönderildi."
                  : "A verification link was sent to the new address.",
            )
          }}
        >
          <h3 className="flex items-center gap-2 font-semibold">
            <Mail size={18} /> {tr ? "E-posta" : "Email"}
          </h3>
          <label className="grid gap-1 text-sm">
            {tr ? "Yeni e-posta" : "New email"}
            <input
              autoComplete="email"
              className={inputClass}
              defaultValue={email}
              name="email"
              required
              type="email"
            />
          </label>
          <button
            className="min-h-11 rounded-md border border-nv-border px-4 font-semibold hover:bg-surface-raised"
            type="submit"
          >
            {tr ? "E-postayı değiştir" : "Change email"}
          </button>
          <p aria-live="polite" className="text-nv-muted-foreground text-sm">
            {emailStatus}
          </p>
        </form>

        <form
          className="grid content-start gap-3"
          onSubmit={async (event) => {
            event.preventDefault()
            if (preview) {
              setPasswordStatus(
                tr
                  ? "Mock hesapta parola değiştirilmez."
                  : "Passwords are not changed for a mock account.",
              )
              return
            }
            const form = event.currentTarget
            const values = new FormData(form)
            const currentPassword = String(values.get("currentPassword") ?? "")
            const newPassword = String(values.get("newPassword") ?? "")
            const confirmation = String(values.get("confirmation") ?? "")
            if (newPassword !== confirmation) {
              setPasswordStatus(
                tr
                  ? "Yeni parolalar eşleşmiyor."
                  : "New passwords do not match.",
              )
              return
            }
            const result = await authClient.changePassword({
              currentPassword,
              newPassword,
              revokeOtherSessions: true,
            })
            setPasswordStatus(
              result.error
                ? result.error.message ||
                    (tr
                      ? "Parola değiştirilemedi."
                      : "Password could not be changed.")
                : tr
                  ? "Parola güncellendi."
                  : "Password updated.",
            )
            if (!result.error) form.reset()
          }}
        >
          <h3 className="flex items-center gap-2 font-semibold">
            <KeyRound size={18} /> {tr ? "Parola" : "Password"}
          </h3>
          <label className="grid gap-1 text-sm">
            {tr ? "Mevcut parola" : "Current password"}
            <input
              autoComplete="current-password"
              className={inputClass}
              minLength={8}
              name="currentPassword"
              required
              type="password"
            />
          </label>
          <label className="grid gap-1 text-sm">
            {tr ? "Yeni parola" : "New password"}
            <input
              autoComplete="new-password"
              className={inputClass}
              minLength={8}
              name="newPassword"
              required
              type="password"
            />
          </label>
          <label className="grid gap-1 text-sm">
            {tr ? "Yeni parolayı doğrula" : "Confirm new password"}
            <input
              autoComplete="new-password"
              className={inputClass}
              minLength={8}
              name="confirmation"
              required
              type="password"
            />
          </label>
          <button
            className="min-h-11 rounded-md border border-nv-border px-4 font-semibold hover:bg-surface-raised"
            type="submit"
          >
            {tr ? "Parolayı değiştir" : "Change password"}
          </button>
          <p aria-live="polite" className="text-nv-muted-foreground text-sm">
            {passwordStatus}
          </p>
        </form>
      </div>
    </section>
  )
}
