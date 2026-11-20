"use client"

import { Languages, LoaderCircle } from "lucide-react"
import { useEffect, useRef, useState } from "react"

type TranslatorAvailability =
  | "available"
  | "downloadable"
  | "downloading"
  | "unavailable"

interface BrowserTranslator {
  translate(input: string): Promise<string>
  destroy?: () => void
}

interface BrowserTranslatorFactory {
  availability(options: {
    sourceLanguage: string
    targetLanguage: string
  }): Promise<TranslatorAvailability>
  create(options: {
    sourceLanguage: string
    targetLanguage: string
  }): Promise<BrowserTranslator>
}

interface DetectedLanguage {
  detectedLanguage: string
  confidence: number
}

interface BrowserLanguageDetector {
  detect(input: string): Promise<DetectedLanguage[]>
  destroy?: () => void
}

interface BrowserLanguageDetectorFactory {
  availability(): Promise<TranslatorAvailability>
  create(): Promise<BrowserLanguageDetector>
}

type TranslatorSupport = "checking" | "supported" | "unsupported"

const unsupportedMessage = "Tarayıcınızda çeviri desteği yok"

function browserTranslatorFactory() {
  return (
    globalThis as typeof globalThis & {
      Translator?: BrowserTranslatorFactory
    }
  ).Translator
}

function browserLanguageDetectorFactory() {
  return (
    globalThis as typeof globalThis & {
      LanguageDetector?: BrowserLanguageDetectorFactory
    }
  ).LanguageDetector
}

export function SeriesDescriptionTranslator({
  description,
}: {
  description: string
}) {
  const [support, setSupport] = useState<TranslatorSupport>("checking")
  const [translatedDescription, setTranslatedDescription] = useState("")
  const [showTranslation, setShowTranslation] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [error, setError] = useState("")
  const translatorRef = useRef<BrowserTranslator | null>(null)
  const detectorRef = useRef<BrowserLanguageDetector | null>(null)

  useEffect(() => {
    let active = true
    setSupport("checking")
    setTranslatedDescription("")
    setShowTranslation(false)
    setError("")
    translatorRef.current?.destroy?.()
    translatorRef.current = null
    detectorRef.current?.destroy?.()
    detectorRef.current = null

    const translatorFactory = browserTranslatorFactory()
    const detectorFactory = browserLanguageDetectorFactory()
    if (!translatorFactory || !detectorFactory) {
      setSupport("unsupported")
      return
    }

    void detectorFactory
      .availability()
      .then((availability) => {
        if (!active) return
        setSupport(availability === "unavailable" ? "unsupported" : "supported")
      })
      .catch(() => {
        if (active) setSupport("unsupported")
      })

    return () => {
      active = false
      translatorRef.current?.destroy?.()
      translatorRef.current = null
      detectorRef.current?.destroy?.()
      detectorRef.current = null
    }
  }, [])

  const translate = async () => {
    if (showTranslation) {
      setShowTranslation(false)
      return
    }
    if (translatedDescription) {
      setShowTranslation(true)
      return
    }

    const translatorFactory = browserTranslatorFactory()
    const detectorFactory = browserLanguageDetectorFactory()
    if (!translatorFactory || !detectorFactory) {
      setSupport("unsupported")
      return
    }

    setTranslating(true)
    setError("")
    try {
      const detector = detectorRef.current ?? (await detectorFactory.create())
      detectorRef.current = detector
      const detected = (await detector.detect(description)).find(
        (candidate) =>
          candidate.detectedLanguage &&
          candidate.detectedLanguage !== "und" &&
          candidate.confidence > 0,
      )
      if (!detected) throw new Error("Seri açıklamasının dili algılanamadı.")
      if (detected.detectedLanguage === "tr") {
        setTranslatedDescription(description)
        setShowTranslation(true)
        return
      }

      const languagePair = {
        sourceLanguage: detected.detectedLanguage,
        targetLanguage: "tr",
      }
      const availability = await translatorFactory.availability(languagePair)
      if (availability === "unavailable")
        throw new Error(
          "Algılanan dil için tarayıcıda Türkçe çeviri desteği yok.",
        )
      const translator =
        translatorRef.current ?? (await translatorFactory.create(languagePair))
      translatorRef.current = translator
      const translated = await translator.translate(description)
      setTranslatedDescription(translated)
      setShowTranslation(true)
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Seri açıklaması çevrilemedi. Lütfen tekrar deneyin.",
      )
    } finally {
      setTranslating(false)
    }
  }

  const unsupported = support === "unsupported"
  const buttonLabel = showTranslation
    ? "Orijinali göster"
    : translating
      ? "Çevriliyor…"
      : "Çevir"

  return (
    <div className="mt-3">
      <span
        className="inline-flex"
        title={unsupported ? unsupportedMessage : undefined}
      >
        <button
          aria-label={
            showTranslation
              ? "Orijinal açıklamayı göster"
              : "Seri açıklamasını çevir"
          }
          className="inline-flex items-center gap-2 rounded-lg border border-nv-border bg-surface-raised px-3 py-1.5 font-semibold text-sm transition-colors enabled:hover:border-nv-primary enabled:hover:text-nv-primary disabled:cursor-not-allowed disabled:opacity-50"
          disabled={support !== "supported" || translating}
          onClick={() => void translate()}
          type="button"
        >
          {translating ? (
            <LoaderCircle
              aria-hidden="true"
              className="animate-spin"
              size={16}
            />
          ) : (
            <Languages aria-hidden="true" size={16} />
          )}
          {buttonLabel}
        </button>
      </span>
      <p
        aria-live="polite"
        className="mt-2 text-nv-muted-foreground"
        lang={showTranslation ? "tr" : "en"}
      >
        {showTranslation ? translatedDescription : description}
      </p>
      {error ? (
        <output className="mt-2 block text-nv-warning text-sm">{error}</output>
      ) : null}
    </div>
  )
}
