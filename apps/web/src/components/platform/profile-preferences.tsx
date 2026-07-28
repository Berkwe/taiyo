"use client"

import { Languages, Monitor, Moon, Palette, Sun, UserRound } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { setLocale } from "~/actions/set-locale"
import type { Locale } from "~/features/platform/domain"
import { paths } from "~/features/platform/paths"
import {
  defaultReaderShortcuts,
  type ReaderShortcuts,
  readReaderShortcuts,
  saveReaderShortcuts,
  shortcutLabel,
} from "~/features/platform/reader-shortcuts"

const themes = [
  { value: "system", icon: Monitor },
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
] as const

export function ProfilePreferences({
  authenticated,
  canPersist,
  initialTranslationLanguage,
  locale,
}: {
  authenticated: boolean
  canPersist: boolean
  initialTranslationLanguage: "tr"
  locale: Locale
}) {
  const tr = locale === "tr"
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [shortcuts, setShortcuts] = useState<ReaderShortcuts>(
    defaultReaderShortcuts,
  )
  const [capturing, setCapturing] = useState<keyof ReaderShortcuts | null>(null)
  const [shortcutStatus, setShortcutStatus] = useState("")
  const [translationLanguage, setTranslationLanguage] = useState<"tr">(
    initialTranslationLanguage,
  )
  const [translationLanguageStatus, setTranslationLanguageStatus] = useState("")

  useEffect(() => {
    setMounted(true)
    setShortcuts(readReaderShortcuts())
    if (localStorage.getItem("novora:translation-language") === "tr")
      setTranslationLanguage("tr")
  }, [])

  const changeLanguage = async (nextLocale: Locale) => {
    await setLocale(nextLocale)
    router.push(`${paths.profile(nextLocale)}?tab=settings`)
    router.refresh()
  }

  const changeTranslationLanguage = async (language: "tr") => {
    setTranslationLanguage(language)
    try {
      localStorage.setItem("novora:translation-language", language)
      if (canPersist) {
        const response = await fetch("/api/profile/translation-language", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language }),
        })
        if (!response.ok) throw new Error("Çeviri dili kaydedilemedi.")
      }
      setTranslationLanguageStatus(
        tr ? "Çeviri dili kaydedildi." : "Translation language saved.",
      )
    } catch (error) {
      setTranslationLanguageStatus(
        error instanceof Error
          ? error.message
          : tr
            ? "Çeviri dili kaydedilemedi."
            : "Translation language could not be saved.",
      )
    }
  }

  const captureShortcut =
    (action: keyof ReaderShortcuts) =>
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (!capturing) return
      event.preventDefault()
      event.stopPropagation()

      if (["Tab", "ShiftLeft", "ShiftRight"].includes(event.code)) return
      if (["ArrowLeft", "ArrowRight", "Escape", "Space"].includes(event.code)) {
        setShortcutStatus(
          tr
            ? "Bu tuş okuyucunun sabit bir kısayolu tarafından kullanılıyor."
            : "This key is reserved by a fixed reader shortcut.",
        )
        setCapturing(null)
        return
      }
      const otherAction = action === "scrollDown" ? "scrollUp" : "scrollDown"
      if (shortcuts[otherAction] === event.code) {
        setShortcutStatus(
          tr
            ? "Aynı tuş iki kaydırma yönüne atanamaz."
            : "The same key cannot control both scroll directions.",
        )
        setCapturing(null)
        return
      }

      const next = { ...shortcuts, [action]: event.code }
      setShortcuts(next)
      saveReaderShortcuts(next)
      setCapturing(null)
      setShortcutStatus(tr ? "Kısayol kaydedildi." : "Shortcut saved.")
    }

  return (
    <div className="grid gap-6">
      <section className="border border-nv-border bg-surface p-5">
        <h2 className="flex items-center gap-2 font-bold text-xl">
          <Palette aria-hidden="true" size={21} />
          {tr ? "Tema" : "Theme"}
        </h2>
        <p className="mt-2 text-nv-muted-foreground text-sm">
          {tr
            ? "NovoraScans görünümünü bu cihaz için seç."
            : "Choose the NovoraScans appearance for this device."}
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {themes.map(({ value, icon: Icon }) => (
            <button
              aria-pressed={mounted && theme === value}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-nv-border px-4 font-semibold aria-pressed:bg-nv-primary aria-pressed:text-nv-primary-foreground"
              disabled={!mounted}
              key={value}
              onClick={() => setTheme(value)}
              type="button"
            >
              <Icon aria-hidden="true" size={18} />
              {value === "system"
                ? tr
                  ? "Sistem"
                  : "System"
                : value === "light"
                  ? tr
                    ? "Açık"
                    : "Light"
                  : tr
                    ? "Koyu"
                    : "Dark"}
            </button>
          ))}
        </div>
      </section>

      <section className="border border-nv-border bg-surface p-5">
        <h2 className="flex items-center gap-2 font-bold text-xl">
          <Languages aria-hidden="true" size={21} />
          {tr ? "Çeviri dili" : "Translation language"}
        </h2>
        <p className="mt-2 text-nv-muted-foreground text-sm">
          {tr
            ? "AI çevirilerinin çıktı dilini seç. Bu tercih arayüz dilinden bağımsızdır."
            : "Choose the output language for AI translations. This is independent from the interface language."}
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            aria-pressed={translationLanguage === "tr"}
            className="min-h-11 rounded-md border border-nv-border px-4 font-semibold aria-pressed:bg-nv-primary aria-pressed:text-nv-primary-foreground"
            onClick={() => void changeTranslationLanguage("tr")}
            type="button"
          >
            🇹🇷 Türkçe
          </button>
        </div>
        <p aria-live="polite" className="mt-3 text-nv-muted-foreground text-sm">
          {translationLanguageStatus}
        </p>
      </section>

      <section className="border border-nv-border bg-surface p-5">
        <h2 className="flex items-center gap-2 font-bold text-xl">
          <Languages aria-hidden="true" size={21} />
          {tr ? "Dil" : "Language"}
        </h2>
        <p className="mt-2 text-nv-muted-foreground text-sm">
          {tr
            ? "Arayüz ve içerik yolları seçtiğin dile geçirilir."
            : "The interface and localized content routes use your selection."}
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {(["tr", "en"] as const).map((option) => (
            <button
              aria-pressed={locale === option}
              className="min-h-11 rounded-md border border-nv-border px-4 font-semibold aria-pressed:bg-nv-primary aria-pressed:text-nv-primary-foreground"
              key={option}
              onClick={() => void changeLanguage(option)}
              type="button"
            >
              {option === "tr" ? "Türkçe" : "English"}
            </button>
          ))}
        </div>
      </section>

      <section className="hidden border border-nv-border bg-surface p-5 lg:block">
        <h2 className="font-bold text-xl">
          {tr ? "Okuyucu kısayolları" : "Reader shortcuts"}
        </h2>
        <p className="mt-2 text-nv-muted-foreground text-sm">
          {tr
            ? "Bir işlemi seç, ardından atamak istediğin tuşa bas. Bu ayarlar yalnız bu bilgisayarda saklanır."
            : "Select an action, then press the key you want to assign. These settings are stored only on this computer."}
        </p>
        <div className="mt-4 grid gap-3">
          {(
            [
              ["scrollDown", tr ? "Aşağı kaydır" : "Scroll down"],
              ["scrollUp", tr ? "Yukarı kaydır" : "Scroll up"],
            ] as const
          ).map(([action, label]) => (
            <div
              className="flex items-center justify-between gap-4 border border-nv-border p-3"
              key={action}
            >
              <span className="font-semibold">{label}</span>
              <button
                className="min-h-10 min-w-32 rounded-md border border-nv-border bg-background px-3 font-mono text-sm focus-visible:outline-2 focus-visible:outline-ring"
                onBlur={() => setCapturing(null)}
                onClick={() => {
                  setCapturing(action)
                  setShortcutStatus(
                    tr ? "Şimdi bir tuşa bas." : "Press a key now.",
                  )
                }}
                onKeyDown={captureShortcut(action)}
                type="button"
              >
                {capturing === action
                  ? tr
                    ? "Tuşa bas…"
                    : "Press a key…"
                  : shortcutLabel(shortcuts[action], locale)}
              </button>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            className="min-h-10 rounded-md border border-nv-border px-4 font-semibold hover:bg-surface-raised"
            onClick={() => {
              setShortcuts(defaultReaderShortcuts)
              saveReaderShortcuts(defaultReaderShortcuts)
              setShortcutStatus(
                tr
                  ? "Varsayılan kısayollar geri yüklendi."
                  : "Default shortcuts restored.",
              )
            }}
            type="button"
          >
            {tr ? "Varsayılanlara dön" : "Restore defaults"}
          </button>
          <p aria-live="polite" className="text-nv-muted-foreground text-sm">
            {shortcutStatus}
          </p>
        </div>
      </section>

      {authenticated ? (
        <section className="border border-nv-border bg-surface p-5">
          <h2 className="flex items-center gap-2 font-bold text-xl">
            <UserRound aria-hidden="true" size={21} />
            {tr ? "Profil ayarları" : "Profile settings"}
          </h2>
          <p className="mt-2 text-nv-muted-foreground text-sm">
            {tr
              ? "Görünen adını, e-postanı ve parolanı profil bölümünden yönet."
              : "Manage your display name, email and password in the profile section."}
          </p>
          <a
            className="mt-4 inline-flex min-h-11 items-center rounded-md bg-nv-primary px-4 font-semibold text-nv-primary-foreground"
            href={`${paths.profile(locale)}?tab=profile#profile-account-settings`}
          >
            {tr ? "Profil ayarlarına git" : "Open profile settings"}
          </a>
        </section>
      ) : null}
    </div>
  )
}
