"use client"

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  Coins,
  LoaderCircle,
  X,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { FollowSeriesButton } from "~/components/platform/follow-series-button"

interface CampaignSummary {
  id: string
  status: string
  qualityTier: "balanced" | "premium"
  translationType: "ai"
  outputLanguage: string
  targetCredits: number
  fundedCredits: number
  chapterIds: string[]
  chapterNumbers: string[]
  chapterProgressStatuses: string[]
  remainingChapterCount: number
  completedExternallyCount: number
  ownCredits: number
  seriesTitle: string
  coverUrl: string
  catalogSeriesId: string
  sourceEditionId: string
  sourceLabel: string
  sourceLanguage?: string
  continuationChapterNumber?: string
  continuationHref?: string
  seriesSlug?: string
  updatedAt: string
}

interface BatchSummary {
  id: string
  status: string
  seriesTitle: string
  coverUrl: string
  qualityTier: "balanced" | "premium"
  eligibleCount: number
  excludedCount: number
  totalCredits: number
  items: {
    id: string
    chapterNumber: string
    status: string
    exclusionReason?: string | null
    failureReason?: string | null
  }[]
}

const activeStatuses = new Set([
  "FUNDING",
  "FUNDED",
  "QUEUED",
  "PROCESSING",
  "PUBLISHING",
])
const formatCredits = new Intl.NumberFormat("tr-TR")
const progressSteps = ["Destek", "Sırada", "Çeviri", "Yayın"] as const
const chapterProgressSteps = ["Sırada", "Çeviri", "Yayınlandı"] as const
const focusableSelector =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function campaignProgress(campaign: CampaignSummary) {
  if (campaign.status === "COMPLETED") {
    return {
      percentage: 100,
      stage: 3,
      text: "Bölümler indirildi ve sitede yayınlandı.",
    }
  }
  if (campaign.status === "PUBLISHING") {
    return {
      percentage: 90,
      stage: 3,
      text: "Çeviri tamamlandı; bölümler yayına hazırlanıyor.",
    }
  }
  if (campaign.status === "PROCESSING") {
    return {
      percentage: 75,
      stage: 2,
      text: "Mandown bölümleri indiriyor ve CBZ dosyaları hazırlanıyor.",
    }
  }
  if (campaign.status === "QUEUED" || campaign.status === "FUNDED") {
    return {
      percentage: 45,
      stage: 1,
      text: "Kredi tamamlandı; çeviri sırası bekleniyor.",
    }
  }
  if (campaign.status === "FUNDING") {
    return {
      percentage: Math.min(
        35,
        Math.round((campaign.fundedCredits / campaign.targetCredits) * 35),
      ),
      stage: 0,
      text: "Çeviri talebinin gerekli krediyi tamamlaması bekleniyor.",
    }
  }
  if (campaign.status === "FAILED") {
    return {
      percentage: 75,
      stage: 2,
      text: "Çeviri tamamlanamadı; yönetici yeniden deneyebilir.",
    }
  }
  if (campaign.status === "REFUNDED") {
    return {
      percentage: 100,
      stage: 0,
      text: "Verilen krediler hesaba iade edildi.",
    }
  }
  return {
    percentage: 100,
    stage: 0,
    text: `Çeviri talebi durumu: ${statusLabel(campaign.status)}`,
  }
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    FUNDING: "Destek Toplanıyor",
    FUNDED: "Sırada",
    QUEUED: "Sırada",
    PROCESSING: "Çevriliyor",
    PUBLISHING: "Yayına Hazırlanıyor",
    COMPLETED: "Yayında",
    FAILED: "Başarısız",
    EXPIRED: "Süresi Doldu",
    CANCELLED: "İptal Edildi",
    REFUNDED: "İade Edildi",
    PARTIAL_FAILED: "Kısmen Tamamlandı",
    EXCLUDED: "İşlemden Çıkarıldı",
  }
  return labels[status] ?? status
}

function chapterProgressStage(status: string) {
  if (status === "COMPLETED") return 2
  if (status === "PUBLISHING") return 2
  if (status === "PROCESSING" || status === "FAILED") return 1
  if (status === "FUNDED" || status === "QUEUED") return 0
  return -1
}

function chapterLabel(campaign: CampaignSummary) {
  if (campaign.chapterNumbers.length === 1)
    return `Bölüm ${campaign.chapterNumbers[0]} · ${campaign.remainingChapterCount} bölüm kaldı`
  if (campaign.chapterNumbers.length > 1) {
    return `Bölüm ${campaign.chapterNumbers[0]}–${campaign.chapterNumbers.at(-1)} · ${campaign.remainingChapterCount} bölüm kaldı`
  }
  return `${campaign.chapterIds.length} bölüm · ${campaign.remainingChapterCount} bölüm kaldı`
}

function outputLanguageLabel(language: string) {
  if (language === "tr") return "Türkçe"
  if (language === "en") return "İngilizce"
  return language.toLocaleUpperCase("tr")
}

function detailActionLabel(status: string) {
  if (status === "PROCESSING" || status === "PUBLISHING")
    return "İlerlemeyi Gör"
  if (status === "REFUNDED") return "İade Detayını Gör"
  if (status === "FAILED") return "Durumu Gör"
  return "Detayları Gör"
}

function ContributionDialog({
  balance,
  campaign,
  loading,
  onClose,
  onSubmit,
}: {
  balance: number
  campaign: CampaignSummary
  loading: boolean
  onClose: () => void
  onSubmit: (credits: number) => void
}) {
  const remaining = Math.max(0, campaign.targetCredits - campaign.fundedCredits)
  const limit = Math.min(balance, remaining)
  const initialCredits = Math.min(10, limit)
  const [selectedCredits, setSelectedCredits] = useState(initialCredits)
  const [customOpen, setCustomOpen] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    closeButtonRef.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  useEffect(() => {
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && !loading) onClose()
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [loading, onClose])

  const trapFocus = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return
    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
    )
    if (!focusable.length) return
    const first = focusable[0]
    const last = focusable.at(-1)
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }

  const chooseCredits = (credits: number) => {
    setCustomOpen(false)
    setSelectedCredits(Math.min(credits, limit))
  }

  return (
    <div
      aria-labelledby="funding-dialog-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-end overflow-y-auto bg-nv-background/80 p-0 backdrop-blur-sm sm:place-items-center sm:p-4"
      onClick={(event) => {
        if (event.currentTarget === event.target && !loading) onClose()
      }}
      onKeyDown={trapFocus}
      role="dialog"
    >
      <div
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-nv-border bg-surface p-5 shadow-2xl sm:my-auto sm:max-w-lg sm:rounded-2xl sm:p-6"
        ref={dialogRef}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-bold text-xl" id="funding-dialog-title">
              Çeviri talebine destek ol
            </h2>
            <p className="mt-1 text-nv-muted-foreground text-sm">
              {campaign.seriesTitle} · {chapterLabel(campaign)}
            </p>
          </div>
          <button
            aria-label="Katkı penceresini kapat"
            className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-surface-raised"
            disabled={loading}
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <dl className="mt-5 grid gap-2 rounded-xl bg-surface-raised p-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-nv-muted-foreground">Mevcut ilerleme</dt>
            <dd className="font-semibold">
              {formatCredits.format(campaign.fundedCredits)} /{" "}
              {formatCredits.format(campaign.targetCredits)} kredi
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-nv-muted-foreground">Kalan kredi</dt>
            <dd>{formatCredits.format(remaining)} kredi</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-nv-muted-foreground">Bakiyen</dt>
            <dd>{formatCredits.format(balance)} kredi</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-nv-muted-foreground">Mevcut katkın</dt>
            <dd>{formatCredits.format(campaign.ownCredits)} kredi</dd>
          </div>
        </dl>

        <fieldset className="mt-5">
          <legend className="font-semibold">Yeni katkı miktarı</legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {[10, 25, 50].map((credits) => {
              const clamped = Math.min(credits, limit)
              return (
                <button
                  aria-pressed={!customOpen && selectedCredits === clamped}
                  className="min-h-11 rounded-lg border border-nv-border px-3 font-semibold aria-pressed:border-nv-primary aria-pressed:bg-nv-primary-soft"
                  disabled={loading || clamped < 1}
                  key={credits}
                  onClick={() => chooseCredits(credits)}
                  type="button"
                >
                  +{credits} kredi
                </button>
              )
            })}
            <button
              aria-expanded={customOpen}
              className="min-h-11 rounded-lg border border-nv-border px-3 font-semibold aria-expanded:border-nv-primary aria-expanded:bg-nv-primary-soft"
              disabled={loading || limit < 1}
              onClick={() => setCustomOpen(true)}
              type="button"
            >
              Özel miktar
            </button>
            <button
              aria-pressed={!customOpen && selectedCredits === limit}
              className="col-span-2 min-h-11 rounded-lg border border-nv-border px-3 font-semibold aria-pressed:border-nv-primary aria-pressed:bg-nv-primary-soft"
              disabled={loading || limit < 1}
              onClick={() => chooseCredits(limit)}
              type="button"
            >
              Kalanı tamamla
            </button>
          </div>
          {customOpen ? (
            <div className="mt-3">
              <label className="font-semibold text-sm" htmlFor="custom-credits">
                Eklenecek kredi
              </label>
              <input
                className="mt-1 min-h-11 w-full appearance-none rounded-lg border border-nv-border bg-background px-3 outline-none focus:border-nv-primary focus:ring-2 focus:ring-nv-primary/20"
                id="custom-credits"
                inputMode="numeric"
                max={limit}
                min={1}
                onChange={(event) => {
                  const value = Number(event.target.value)
                  setSelectedCredits(
                    Number.isSafeInteger(value)
                      ? Math.max(0, Math.min(value, limit))
                      : 0,
                  )
                }}
                type="number"
                value={selectedCredits || ""}
              />
              <p className="mt-1 text-nv-muted-foreground text-xs">
                En fazla {formatCredits.format(limit)} kredi ekleyebilirsin.
              </p>
            </div>
          ) : null}
        </fieldset>

        <dl className="mt-5 grid gap-2 border-nv-border border-t pt-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-nv-muted-foreground">Seçilen yeni katkı</dt>
            <dd className="font-bold">
              {formatCredits.format(selectedCredits)} kredi
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-nv-muted-foreground">
              İşlem sonrası toplam katkın
            </dt>
            <dd className="font-semibold">
              {formatCredits.format(campaign.ownCredits + selectedCredits)}{" "}
              kredi
            </dd>
          </div>
        </dl>

        <button
          aria-label={`${campaign.seriesTitle} çeviri talebine ${selectedCredits} kredi destek ol`}
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-nv-primary px-4 font-semibold text-nv-primary-foreground disabled:opacity-50"
          disabled={
            loading ||
            !Number.isSafeInteger(selectedCredits) ||
            selectedCredits < 1 ||
            selectedCredits > limit
          }
          onClick={() => onSubmit(selectedCredits)}
          type="button"
        >
          {loading ? (
            <LoaderCircle
              aria-hidden="true"
              className="animate-spin"
              size={18}
            />
          ) : (
            <Coins aria-hidden="true" size={18} />
          )}
          {loading ? "Katkın kaydediliyor…" : "Desteği Onayla"}
        </button>
      </div>
    </div>
  )
}

export function MyTranslations() {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([])
  const [batches, setBatches] = useState<BatchSummary[]>([])
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [fundingId, setFundingId] = useState("")
  const [fundingMessage, setFundingMessage] = useState<Record<string, string>>(
    {},
  )
  const [dialogCampaign, setDialogCampaign] = useState<CampaignSummary | null>(
    null,
  )
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set())
  const fundingTriggerRef = useRef<HTMLButtonElement | null>(null)

  const load = useCallback(async () => {
    try {
      const [campaignResponse, batchResponse] = await Promise.all([
        fetch("/api/translation/campaigns", { cache: "no-store" }),
        fetch("/api/translation/batches", { cache: "no-store" }),
      ])
      const body = (await campaignResponse.json()) as {
        balance?: number
        campaigns?: CampaignSummary[]
        error?: string
      }
      const batchBody = (await batchResponse.json()) as {
        batches?: BatchSummary[]
        error?: string
      }
      if (!campaignResponse.ok)
        throw new Error(body.error ?? "Çeviri talepleri yüklenemedi.")
      if (!batchResponse.ok)
        throw new Error(batchBody.error ?? "Çoklu çeviriler yüklenemedi.")
      setCampaigns(body.campaigns ?? [])
      setBatches(batchBody.batches ?? [])
      setBalance(body.balance ?? 0)
      setError("")
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Çeviri talepleri yüklenemedi.",
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (
      !campaigns.some((campaign) => activeStatuses.has(campaign.status)) &&
      !batches.some((batch) => ["QUEUED", "PROCESSING"].includes(batch.status))
    )
      return
    const timer = window.setInterval(() => void load(), 3_000)
    return () => window.clearInterval(timer)
  }, [batches, campaigns, load])

  const closeDialog = useCallback(() => {
    setDialogCampaign(null)
    window.setTimeout(() => fundingTriggerRef.current?.focus(), 0)
  }, [])

  const addFunding = async (campaign: CampaignSummary, requested: number) => {
    if (fundingId) return
    const remaining = Math.max(
      0,
      campaign.targetCredits - campaign.fundedCredits,
    )
    const credits = Math.min(requested, remaining, balance)
    if (!Number.isSafeInteger(credits) || credits < 1) return
    setFundingId(campaign.id)
    setFundingMessage((current) => ({
      ...current,
      [campaign.id]: "Katkın kaydediliyor…",
    }))
    try {
      const response = await fetch("/api/translation/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          catalogSeriesId: campaign.catalogSeriesId,
          sourceEditionId: campaign.sourceEditionId,
          chapterIds: campaign.chapterIds,
          qualityTier: campaign.qualityTier,
          mode: "community",
          credits,
        }),
      })
      const body = (await response.json()) as {
        error?: string
        message?: string
      }
      const message =
        (response.ok ? body.message : body.error) ?? "Katkı kaydedilemedi."
      setFundingMessage((current) => ({
        ...current,
        [campaign.id]: message,
      }))
      if (response.ok) {
        setDialogCampaign(null)
        await load()
        window.setTimeout(() => fundingTriggerRef.current?.focus(), 0)
      }
    } catch (fundingError) {
      setFundingMessage((current) => ({
        ...current,
        [campaign.id]:
          fundingError instanceof Error
            ? fundingError.message
            : "Katkı kaydedilemedi.",
      }))
    } finally {
      setFundingId("")
    }
  }

  const toggleDetails = (campaignId: string) => {
    setExpandedDetails((current) => {
      const next = new Set(current)
      if (next.has(campaignId)) next.delete(campaignId)
      else next.add(campaignId)
      return next
    })
  }

  if (loading) {
    return (
      <p className="mt-10 flex items-center gap-2 text-nv-muted-foreground">
        <LoaderCircle className="animate-spin" size={18} />
        Çeviri talepleri yükleniyor…
      </p>
    )
  }

  if (error) {
    return (
      <p className="mt-10 flex items-center gap-2 text-danger">
        <AlertTriangle size={18} />
        {error}
      </p>
    )
  }

  if (!campaigns.length && !batches.length) {
    return (
      <section className="mt-10 border border-nv-border bg-surface p-8">
        <h2 className="font-bold text-xl">Henüz çeviri talebin yok</h2>
        <p className="mt-2 text-nv-muted-foreground">
          Bir seri ve bölüm seçtiğinde ilerleme burada görünecek.
        </p>
        <Link
          className="mt-5 inline-flex min-h-11 items-center bg-nv-primary px-5 font-semibold text-nv-primary-foreground"
          href="/translate"
        >
          Seri seç
        </Link>
      </section>
    )
  }

  return (
    <div className="mt-10 grid gap-5">
      {batches.map((batch) => (
        <article
          className="grid min-w-0 gap-4 rounded-2xl border border-nv-border bg-surface p-4 sm:grid-cols-[88px_minmax(0,1fr)] sm:p-5"
          key={batch.id}
        >
          <div className="relative mx-auto aspect-[2/3] w-20 overflow-hidden rounded-lg bg-surface-muted sm:mx-0 sm:w-full">
            <Image
              alt={`${batch.seriesTitle} kapak görseli`}
              className="object-cover"
              fill
              sizes="88px"
              src={batch.coverUrl}
            />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="select-text font-bold text-xl sm:text-2xl">
                  {batch.seriesTitle}
                </h2>
                <p className="mt-1 text-nv-muted-foreground text-sm">
                  Çoklu anında çeviri · {batch.eligibleCount} bölüm ·{" "}
                  {formatCredits.format(batch.totalCredits)} kredi
                </p>
                {batch.excludedCount ? (
                  <p className="mt-1 text-nv-muted-foreground text-xs">
                    {batch.excludedCount} bölüm işlemden çıkarıldı.
                  </p>
                ) : null}
              </div>
              <span
                className="inline-flex items-center gap-1.5 rounded-full bg-surface-raised px-3 py-1.5 font-semibold text-sm"
                data-batch-status={batch.status}
              >
                {["QUEUED", "PROCESSING"].includes(batch.status) ? (
                  <LoaderCircle className="animate-spin" size={17} />
                ) : batch.status === "COMPLETED" ? (
                  <CheckCircle2 className="text-success" size={17} />
                ) : null}
                {statusLabel(batch.status)}
              </span>
            </div>
            <div className="mt-4 grid gap-2">
              {batch.items.map((item) => (
                <div
                  className="flex items-start justify-between gap-3 rounded-lg bg-surface-raised px-3 py-2.5"
                  key={item.id}
                >
                  <span className="font-semibold text-sm">
                    Bölüm {item.chapterNumber}
                  </span>
                  <span className="max-w-[65%] text-right text-nv-muted-foreground text-xs">
                    {statusLabel(item.status)}
                    {item.failureReason || item.exclusionReason
                      ? ` · ${item.failureReason ?? item.exclusionReason}`
                      : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </article>
      ))}
      {campaigns.map((campaign) => {
        const progress = campaignProgress(campaign)
        const completed = campaign.status === "COMPLETED"
        const remaining = Math.max(
          0,
          campaign.targetCredits - campaign.fundedCredits,
        )
        const canFund =
          campaign.status === "FUNDING" && remaining > 0 && balance > 0
        const detailsOpen = expandedDetails.has(campaign.id)
        const seriesHref = campaign.seriesSlug
          ? `/tr/seri/${campaign.seriesSlug}`
          : null

        return (
          <article
            className="grid min-w-0 gap-4 rounded-2xl border border-nv-border bg-surface p-4 sm:grid-cols-[88px_minmax(0,1fr)] sm:p-5"
            key={campaign.id}
          >
            <div className="relative mx-auto aspect-[2/3] w-20 overflow-hidden rounded-lg bg-surface-muted sm:mx-0 sm:w-full">
              <Image
                alt={`${campaign.seriesTitle} kapak görseli`}
                className="object-cover"
                fill
                sizes="88px"
                src={campaign.coverUrl}
              />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="select-text truncate font-bold text-xl sm:text-2xl">
                    {seriesHref ? (
                      <Link className="hover:text-nv-primary" href={seriesHref}>
                        {campaign.seriesTitle}
                      </Link>
                    ) : (
                      campaign.seriesTitle
                    )}
                  </h2>
                  <p className="mt-1 text-nv-muted-foreground text-sm">
                    {chapterLabel(campaign)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <span
                      className={
                        campaign.qualityTier === "premium"
                          ? "quality-badge-premium"
                          : "quality-badge-balanced"
                      }
                    >
                      {campaign.qualityTier === "premium"
                        ? "Premium"
                        : "Dengeli"}
                    </span>
                    <span className="text-nv-muted-foreground">
                      {campaign.sourceLabel} →{" "}
                      {outputLanguageLabel(campaign.outputLanguage)}
                    </span>
                  </div>
                </div>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full bg-surface-raised px-3 py-1.5 font-semibold text-sm"
                  data-campaign-status={campaign.status}
                >
                  {completed ? (
                    <CheckCircle2 className="text-success" size={17} />
                  ) : activeStatuses.has(campaign.status) ? (
                    <LoaderCircle className="animate-spin" size={17} />
                  ) : null}
                  {statusLabel(campaign.status)}
                </span>
              </div>

              <div
                aria-label="Toplanan çeviri kredisi"
                aria-valuemax={campaign.targetCredits}
                aria-valuemin={0}
                aria-valuenow={campaign.fundedCredits}
                className="mt-5 h-2 overflow-hidden rounded-full bg-surface-raised"
                role="progressbar"
              >
                <span
                  className="block h-full bg-nv-primary transition-[width] duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      (campaign.fundedCredits / campaign.targetCredits) * 100,
                    )}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-sm">
                {formatCredits.format(campaign.fundedCredits)} /{" "}
                {formatCredits.format(campaign.targetCredits)} kredi · Senin
                katkın: {formatCredits.format(campaign.ownCredits)}
              </p>
              {remaining > 0 ? (
                <p className="mt-1 text-nv-muted-foreground text-sm">
                  {formatCredits.format(remaining)} kredi kaldı
                </p>
              ) : null}

              <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  aria-controls={`campaign-details-${campaign.id}`}
                  aria-expanded={detailsOpen}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-nv-border px-4 font-semibold text-sm"
                  onClick={() => toggleDetails(campaign.id)}
                  type="button"
                >
                  {campaign.chapterIds.length} bölümün durumunu görüntüle
                  <ChevronDown
                    aria-hidden="true"
                    className={detailsOpen ? "rotate-180" : ""}
                    size={17}
                  />
                </button>

                {canFund ? (
                  <button
                    aria-label={`${campaign.seriesTitle} çeviri talebine destek ol`}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-nv-primary px-5 font-semibold text-nv-primary-foreground sm:ml-auto"
                    onClick={(event) => {
                      fundingTriggerRef.current = event.currentTarget
                      setDialogCampaign(campaign)
                    }}
                    type="button"
                  >
                    <Coins aria-hidden="true" size={17} />
                    Destek Ol
                  </button>
                ) : completed && seriesHref ? (
                  <Link
                    aria-label={`${campaign.seriesTitle} bölümlerini oku`}
                    className="inline-flex min-h-11 items-center justify-center rounded-lg bg-nv-primary px-5 font-semibold text-nv-primary-foreground sm:ml-auto"
                    href={seriesHref}
                  >
                    Bölümü Oku
                  </Link>
                ) : (
                  <button
                    aria-controls={`campaign-details-${campaign.id}`}
                    className="inline-flex min-h-11 items-center justify-center rounded-lg bg-nv-primary px-5 font-semibold text-nv-primary-foreground sm:ml-auto"
                    onClick={() => toggleDetails(campaign.id)}
                    type="button"
                  >
                    {detailActionLabel(campaign.status)}
                  </button>
                )}
              </div>

              <details
                className="mt-4 rounded-xl border border-nv-border bg-background"
                id={`campaign-details-${campaign.id}`}
                open={detailsOpen}
              >
                <summary className="sr-only">Talep ayrıntıları</summary>
                <div className="grid gap-5 p-4">
                  <div>
                    <h3 className="font-semibold text-sm">Talep süreci</h3>
                    <div className="relative mt-3">
                      <div className="absolute top-3 right-[12.5%] left-[12.5%] h-0.5 bg-surface-raised" />
                      <div
                        className="absolute top-3 left-[12.5%] h-0.5 bg-nv-primary"
                        style={{
                          width: `${(progress.stage / (progressSteps.length - 1)) * 75}%`,
                        }}
                      />
                      <ol className="relative grid grid-cols-4">
                        {progressSteps.map((step, index) => {
                          const reached = index <= progress.stage
                          return (
                            <li
                              className="grid justify-items-center gap-1 text-center"
                              key={step}
                            >
                              <span
                                className={`grid size-6 place-items-center rounded-full border font-bold text-[10px] ${
                                  reached
                                    ? "border-nv-primary bg-nv-primary text-nv-primary-foreground"
                                    : "border-nv-border bg-surface text-nv-muted-foreground"
                                }`}
                              >
                                {index < progress.stage ? (
                                  <Check aria-hidden="true" size={11} />
                                ) : (
                                  index + 1
                                )}
                              </span>
                              <span
                                className={
                                  reached
                                    ? "font-semibold text-xs"
                                    : "text-nv-muted-foreground text-xs"
                                }
                              >
                                {step}
                              </span>
                            </li>
                          )
                        })}
                      </ol>
                    </div>
                    <div
                      aria-label="Çeviri talebi süreç ilerlemesi"
                      aria-valuemax={100}
                      aria-valuemin={0}
                      aria-valuenow={progress.percentage}
                      className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-raised"
                      role="progressbar"
                    >
                      <span
                        className="block h-full bg-nv-primary"
                        style={{ width: `${progress.percentage}%` }}
                      />
                    </div>
                    <p className="mt-2 text-nv-muted-foreground text-sm">
                      {progress.text}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-sm">Bölüm durumları</h3>
                    <div className="mt-2 grid max-h-72 gap-2 overflow-y-auto pr-1">
                      {campaign.chapterIds.map((chapterId, index) => {
                        const chapterNumber =
                          campaign.chapterNumbers[index] ?? String(index + 1)
                        const chapterStatus =
                          campaign.chapterProgressStatuses[index] ??
                          campaign.status
                        const chapterStage = chapterProgressStage(chapterStatus)
                        return (
                          <article
                            className="rounded-lg bg-surface-raised px-3 py-2.5"
                            key={chapterId}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="truncate font-semibold text-sm">
                                Bölüm {chapterNumber}
                              </p>
                              <span className="text-nv-muted-foreground text-xs">
                                {statusLabel(chapterStatus)}
                              </span>
                            </div>
                            {chapterStage >= 0 ? (
                              <ol
                                aria-label={`Bölüm ${chapterNumber} çeviri aşamaları`}
                                className="mt-2 grid grid-cols-3 gap-1 text-xs"
                              >
                                {chapterProgressSteps.map((step, stepIndex) => (
                                  <li
                                    className={
                                      stepIndex <= chapterStage
                                        ? "font-semibold text-nv-primary"
                                        : "text-nv-muted-foreground"
                                    }
                                    key={step}
                                  >
                                    {step}
                                  </li>
                                ))}
                              </ol>
                            ) : null}
                          </article>
                        )
                      })}
                    </div>
                  </div>

                  {completed && campaign.continuationHref ? (
                    <Link
                      className="inline-flex min-h-11 items-center justify-center rounded-lg border border-nv-border px-4 font-semibold"
                      href={campaign.continuationHref}
                    >
                      Devamını çevir
                      {campaign.continuationChapterNumber
                        ? ` · Bölüm ${campaign.continuationChapterNumber}`
                        : ""}
                    </Link>
                  ) : null}
                  {completed && campaign.seriesSlug ? (
                    <FollowSeriesButton
                      followLabel="Haber et"
                      locale="tr"
                      seriesSlug={campaign.seriesSlug}
                      unfollowLabel="Bildirimleri kapat"
                    />
                  ) : null}
                </div>
              </details>

              {fundingMessage[campaign.id] ? (
                <p aria-live="polite" className="mt-3 text-sm">
                  {fundingMessage[campaign.id]}
                </p>
              ) : null}
            </div>
          </article>
        )
      })}

      {dialogCampaign ? (
        <ContributionDialog
          balance={balance}
          campaign={dialogCampaign}
          loading={fundingId === dialogCampaign.id}
          onClose={closeDialog}
          onSubmit={(credits) => void addFunding(dialogCampaign, credits)}
        />
      ) : null}
    </div>
  )
}
