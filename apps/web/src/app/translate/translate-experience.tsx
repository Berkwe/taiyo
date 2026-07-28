"use client"

import {
  ArrowLeft,
  CircleHelp,
  Coins,
  Languages,
  LoaderCircle,
  Search,
  Sparkles,
} from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { SourceInfoPopover } from "~/components/platform/source-info-popover"
import { compactChapterNumbers } from "~/features/translation/campaign-accounting"
import type {
  AniListCatalogSearchItem,
  ExistingTranslation,
  OutputLanguage,
  PricingQuote,
  PublicCatalogSeries,
  PublicSourceEdition,
  TranslationQuality,
  TranslationRequestConflict,
} from "~/features/translation/types"
import { outputLanguages } from "~/features/translation/types"

const formatCredits = new Intl.NumberFormat("tr-TR")
const searchStatusLabels: Record<string, string> = {
  RELEASING: "Devam ediyor",
  FINISHED: "Tamamlandı",
  NOT_YET_RELEASED: "Henüz yayımlanmadı",
  CANCELLED: "İptal edildi",
  HIATUS: "Ara verdi",
}
const searchFormatLabels: Record<string, string> = {
  MANGA: "Manga",
  NOVEL: "Roman",
  ONE_SHOT: "Tek bölüm",
  MANHWA: "Manhwa",
  MANHUA: "Manhua",
}

interface CampaignSummary {
  id: string
  status: string
  qualityTier: TranslationQuality
  targetCredits: number
  fundedCredits: number
  chapterIds: string[]
  contributorCount: number
  ownCredits: number
}

interface BatchInstantQuote {
  requestedCount: number
  eligibleCount: number
  excludedCount: number
  perChapterCredits: number
  totalCredits: number
  balance: number
  missingCredits: number
  items: {
    sourceChapterId: string
    chapterNumber: string
    eligible: boolean
    exclusionReason?: string
  }[]
}

interface BatchInstantResult {
  id: string
  status: string
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

class SourceUnavailableError extends Error {
  constructor() {
    super("Kaynak kullanılamıyor.")
    this.name = "SourceUnavailableError"
  }
}

export function TranslateExperience({
  authenticated,
  balance,
  initialQuery,
  initialQuality,
  initialOutputLanguage = "tr",
  initialResults,
  initialSelectionMode,
  initialSeriesId,
  nextChapter,
  preferredSourceEditionId,
  requireSourceChoice = false,
  detailMode = false,
}: {
  authenticated: boolean
  balance: number
  initialQuery: string
  initialQuality?: TranslationQuality
  initialOutputLanguage?: OutputLanguage
  initialResults: PublicCatalogSeries[]
  initialSelectionMode?: "single" | "range"
  initialSeriesId?: string
  nextChapter?: string
  preferredSourceEditionId?: string
  requireSourceChoice?: boolean
  detailMode?: boolean
}) {
  const router = useRouter()
  const [query, setQuery] = useState(initialQuery)
  const [series, setSeries] = useState<PublicCatalogSeries | null>(
    (initialSeriesId
      ? initialResults.find(
          (item) =>
            item.id === initialSeriesId ||
            item.canonicalSeriesId === initialSeriesId,
        )
      : null) ??
      (initialSeriesId && initialResults.length === 1
        ? initialResults[0]!
        : null),
  )
  const [edition, setEdition] = useState<PublicSourceEdition | null>(null)
  const [selectedChapters, setSelectedChapters] = useState<string[]>([])
  const [quality, setQuality] = useState<TranslationQuality | null>(
    initialQuality ?? null,
  )
  const [outputLanguage, setOutputLanguage] = useState<OutputLanguage>(
    initialOutputLanguage,
  )
  const [outputLanguageQuery, setOutputLanguageQuery] = useState("")
  const [quote, setQuote] = useState<PricingQuote | null>(null)
  const [batchQuote, setBatchQuote] = useState<BatchInstantQuote | null>(null)
  const [quoting, setQuoting] = useState(false)
  const [actionMessage, setActionMessage] = useState("")
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<
    AniListCatalogSearchItem[]
  >([])
  const [searchComplete, setSearchComplete] = useState(Boolean(initialQuery))
  const [searchError, setSearchError] = useState("")
  const [searchRetryAfter, setSearchRetryAfter] = useState<number | null>(null)
  const [selectingAnilistId, setSelectingAnilistId] = useState<number | null>(
    null,
  )
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([])
  const [loadingSourceIds, setLoadingSourceIds] = useState<Set<string>>(
    new Set(),
  )
  const [sourceErrors, setSourceErrors] = useState<Record<string, string>>({})
  const [step, setStep] = useState<"source" | "chapters">("source")
  const [selectionMode, setSelectionMode] = useState<"single" | "range">(
    initialSelectionMode ?? "single",
  )
  const [rangeStart, setRangeStart] = useState("")
  const [rangeEnd, setRangeEnd] = useState("")
  const [rangeStartText, setRangeStartText] = useState("")
  const [rangeEndText, setRangeEndText] = useState("")
  const [activeRangeHandle, setActiveRangeHandle] = useState<
    "start" | "end" | null
  >(null)
  const [existingTranslations, setExistingTranslations] = useState<
    ExistingTranslation[]
  >([])
  const [conflictingRequests, setConflictingRequests] = useState<
    TranslationRequestConflict[]
  >([])
  const [pendingSubmission, setPendingSubmission] = useState<{
    mode: "community" | "complete"
    credits: number
    request?: TranslationRequestConflict
  } | null>(null)
  const [translationChoiceOpen, setTranslationChoiceOpen] = useState(false)
  const [selectedContribution, setSelectedContribution] = useState<
    number | null
  >(null)
  const [contributionPreset, setContributionPreset] = useState<
    "ten" | "all" | "custom" | null
  >(null)
  const [customContributionOpen, setCustomContributionOpen] = useState(false)
  const [customContribution, setCustomContribution] = useState("")
  const [authPromptOpen, setAuthPromptOpen] = useState(false)
  const [batchConfirmationOpen, setBatchConfirmationOpen] = useState(false)
  const [batchSubmitting, setBatchSubmitting] = useState(false)
  const [batchResult, setBatchResult] = useState<BatchInstantResult | null>(
    null,
  )
  const batchIdempotencyKey = useRef("")
  const searchController = useRef<AbortController | null>(null)
  const searchSequence = useRef(0)
  const immediateSearchQuery = useRef<string | null>(null)
  const hydratingSourceRequests = useRef(
    new Map<string, Promise<PublicSourceEdition>>(),
  )
  const qualityStepRef = useRef<HTMLDivElement>(null)
  const languageStepRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setQuery(initialQuery)
  }, [initialQuery])

  const runSearch = useCallback(async (value: string) => {
    const normalized = value.trim()
    searchController.current?.abort()
    const sequence = ++searchSequence.current
    if (!normalized) {
      setSearchResults([])
      setSearchComplete(false)
      setSearchError("")
      setSearchRetryAfter(null)
      setSearching(false)
      return
    }
    const controller = new AbortController()
    searchController.current = controller
    setSearching(true)
    setSearchComplete(false)
    setSearchError("")
    setSearchRetryAfter(null)
    try {
      const response = await fetch(
        `/api/translation/catalog?q=${encodeURIComponent(normalized)}`,
        { signal: controller.signal },
      )
      const body = (await response.json()) as {
        results?: AniListCatalogSearchItem[]
        error?: string
        retryAfter?: number
      }
      if (!response.ok) {
        const retryAfter = Number(
          body.retryAfter ?? response.headers.get("Retry-After"),
        )
        if (response.status === 429 && Number.isFinite(retryAfter))
          setSearchRetryAfter(retryAfter)
        throw new Error(body.error ?? "Arama tamamlanamadı.")
      }
      if (sequence !== searchSequence.current) return
      setSearchResults(body.results ?? [])
      setSearchComplete(true)
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return
      if (sequence !== searchSequence.current) return
      setSearchResults([])
      setSearchComplete(true)
      setSearchError(
        error instanceof Error ? error.message : "Arama tamamlanamadı.",
      )
    } finally {
      if (sequence === searchSequence.current) setSearching(false)
    }
  }, [])

  useEffect(() => {
    if (detailMode) return
    const normalized = query.trim()
    if (!normalized) {
      searchController.current?.abort()
      setSearchResults([])
      setSearchComplete(false)
      setSearchError("")
      setSearchRetryAfter(null)
      setSearching(false)
      return
    }
    const timer = window.setTimeout(() => {
      if (immediateSearchQuery.current === normalized) {
        immediateSearchQuery.current = null
        return
      }
      void runSearch(normalized)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [detailMode, query, runSearch])

  useEffect(
    () => () => {
      searchController.current?.abort()
    },
    [],
  )

  const selectSearchResult = useCallback(
    async (item: AniListCatalogSearchItem) => {
      setSelectingAnilistId(item.anilistId)
      setSearchError("")
      setSearchRetryAfter(null)
      try {
        const response = await fetch("/api/translation/catalog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selectionToken: item.selectionToken }),
        })
        const body = (await response.json()) as {
          series?: PublicCatalogSeries
          error?: string
          retryAfter?: number
        }
        if (!response.ok || !body.series) {
          const retryAfter = Number(
            body.retryAfter ?? response.headers.get("Retry-After"),
          )
          if (response.status === 429 && Number.isFinite(retryAfter))
            setSearchRetryAfter(retryAfter)
          throw new Error(body.error ?? "Seri ayrıntıları yüklenemedi.")
        }
        setSeries(body.series)
        setEdition(null)
        setSelectedChapters([])
        setStep("source")
        setActionMessage("")
        setSelectingAnilistId(null)
        window.history.replaceState(null, "", "/translate")
      } catch (error) {
        setSearchError(
          error instanceof Error
            ? error.message
            : "Seri ayrıntıları yüklenemedi.",
        )
        setSelectingAnilistId(null)
      }
    },
    [],
  )

  const loadCampaigns = useCallback(() => {
    if (!authenticated) return
    void fetch("/api/translation/campaigns").then(async (response) => {
      const body = (await response.json()) as {
        campaigns?: CampaignSummary[]
      }
      setCampaigns(body.campaigns ?? [])
    })
  }, [authenticated])

  useEffect(() => loadCampaigns(), [loadCampaigns])

  const applyEdition = useCallback(
    (item: PublicSourceEdition, owner: PublicCatalogSeries) => {
      setSeries((current) => {
        const base = current?.id === owner.id ? current : owner
        return {
          ...base,
          editions: base.editions.map((source) =>
            source.id === item.id ? item : source,
          ),
        }
      })
      setEdition(item)
      const requested = item.chapters.find(
        (chapter) => chapter.number === nextChapter,
      )
      setSelectedChapters(requested ? [requested.id] : [])
      setRangeStart(requested?.id ?? item.chapters[0]?.id ?? "")
      setRangeEnd(requested?.id ?? item.chapters.at(-1)?.id ?? "")
      setRangeStartText(requested?.number ?? item.chapters[0]?.number ?? "")
      setRangeEndText(requested?.number ?? item.chapters.at(-1)?.number ?? "")
      setStep("chapters")
      setActionMessage("")
      try {
        localStorage.setItem(
          `novora:translation-source:${owner.canonicalKey}`,
          item.id,
        )
      } catch {
        // Storage-disabled browsers still keep the in-memory selection.
      }
      if (authenticated) {
        void fetch("/api/translation/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            canonicalKey: owner.canonicalKey,
            sourceEditionId: item.id,
          }),
        })
      }
    },
    [authenticated, nextChapter],
  )

  const hydrateSource = useCallback(
    (item: PublicSourceEdition, owner: PublicCatalogSeries) => {
      if (item.chaptersLoaded) return Promise.resolve(item)
      const pending = hydratingSourceRequests.current.get(item.id)
      if (pending) return pending

      setLoadingSourceIds((current) => new Set(current).add(item.id))
      setSourceErrors((current) => {
        const next = { ...current }
        delete next[item.id]
        return next
      })
      const request = fetch(
        `/api/translation/catalog?seriesId=${encodeURIComponent(owner.id)}&sourceEditionId=${encodeURIComponent(item.id)}`,
      )
        .then(async (response) => {
          const body = (await response.json()) as {
            edition?: PublicSourceEdition
            error?: string
          }
          if (response.status === 404) throw new SourceUnavailableError()
          if (!response.ok || !body.edition)
            throw new Error(body.error ?? "Kaynak yüklenemedi.")
          setSeries((current) => {
            if (!current || current.id !== owner.id) return current
            return {
              ...current,
              editions: current.editions.map((source) =>
                source.id === body.edition?.id ? body.edition : source,
              ),
            }
          })
          return body.edition
        })
        .catch((error) => {
          if (error instanceof SourceUnavailableError) {
            setSeries((current) =>
              current?.id === owner.id
                ? {
                    ...current,
                    editions: current.editions.filter(
                      (source) => source.id !== item.id,
                    ),
                  }
                : current,
            )
            throw error
          }
          const message =
            error instanceof Error ? error.message : "Kaynak yüklenemedi."
          setSourceErrors((current) => ({ ...current, [item.id]: message }))
          throw error
        })
        .finally(() => {
          hydratingSourceRequests.current.delete(item.id)
          setLoadingSourceIds((current) => {
            const next = new Set(current)
            next.delete(item.id)
            return next
          })
        })
      hydratingSourceRequests.current.set(item.id, request)
      return request
    },
    [],
  )

  const chooseEdition = useCallback(
    async (item: PublicSourceEdition, owner: PublicCatalogSeries) => {
      if (item.chaptersLoaded) {
        applyEdition(item, owner)
        return
      }
      setActionMessage("Gerçek kaynak bölüm listesi yükleniyor…")
      try {
        const hydrated = await hydrateSource(item, owner)
        const hydratedOwner = {
          ...owner,
          editions: owner.editions.map((source) =>
            source.id === hydrated.id ? hydrated : source,
          ),
        }
        applyEdition(hydrated, hydratedOwner)
      } catch (error) {
        if (error instanceof SourceUnavailableError) {
          setActionMessage("")
          return
        }
        setActionMessage(
          error instanceof Error ? error.message : "Kaynak yüklenemedi.",
        )
      }
    },
    [applyEdition, hydrateSource],
  )

  useEffect(() => {
    if (!series || step !== "source") return
    const pendingSources = series.editions.filter(
      (source) =>
        !source.chaptersLoaded &&
        !hydratingSourceRequests.current.has(source.id) &&
        !sourceErrors[source.id],
    )
    if (!pendingSources.length) return
    const frame = window.requestAnimationFrame(() => {
      for (const source of pendingSources)
        void hydrateSource(source, series).catch(() => {
          // Kaynak kartı kendi hata ve tekrar deneme durumunu gösterir.
        })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [hydrateSource, series, sourceErrors, step])

  useEffect(() => {
    if (!series || edition) return
    if (!detailMode) {
      const onlySource =
        series.editions.length === 1 ? series.editions[0] : null
      if (onlySource) void chooseEdition(onlySource, series)
      return
    }
    if (requireSourceChoice && !preferredSourceEditionId) return
    let remembered = preferredSourceEditionId
    try {
      remembered ??=
        localStorage.getItem(
          `novora:translation-source:${series.canonicalKey}`,
        ) ?? undefined
    } catch {
      // Ignore unavailable localStorage.
    }
    const selected =
      series.editions.find((item) => item.id === remembered) ??
      [...series.editions].sort((left, right) => {
        const language =
          Number(right.sourceLanguage === "en") -
          Number(left.sourceLanguage === "en")
        return language || right.priority - left.priority
      })[0]
    if (selected) void chooseEdition(selected, series)
  }, [
    chooseEdition,
    detailMode,
    edition,
    preferredSourceEditionId,
    requireSourceChoice,
    series,
  ])

  useEffect(() => {
    if (
      !edition ||
      selectedChapters.length === 0 ||
      !quality ||
      !outputLanguage
    ) {
      setQuote(null)
      setBatchQuote(null)
      setExistingTranslations([])
      setConflictingRequests([])
      return
    }
    const controller = new AbortController()
    setQuote(null)
    setBatchQuote(null)
    setExistingTranslations([])
    setConflictingRequests([])
    setSelectedContribution(null)
    setContributionPreset(null)
    setCustomContribution("")
    setCustomContributionOpen(false)
    setActionMessage("")
    setQuoting(true)
    const timer = window.setTimeout(() => {
      void (async () => {
        const requestBody = {
          sourceEditionId: edition.id,
          chapterIds: selectedChapters,
          qualityTier: quality,
        }
        const [quoteResponse, batchResponse] = await Promise.all([
          fetch("/api/translation/quote", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          }),
          selectedChapters.length > 1
            ? fetch("/api/translation/batches/quote", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  catalogSeriesId: series?.id,
                  ...requestBody,
                }),
                signal: controller.signal,
              })
            : Promise.resolve(null),
        ])
        const body = (await quoteResponse.json()) as {
          quote?: PricingQuote
          existingTranslations?: ExistingTranslation[]
          conflictingRequests?: TranslationRequestConflict[]
          error?: string
        }
        if (!quoteResponse.ok) throw new Error(body.error)
        setQuote(body.quote ?? null)
        setExistingTranslations(body.existingTranslations ?? [])
        setConflictingRequests(body.conflictingRequests ?? [])
        if (batchResponse) {
          const batchBody = (await batchResponse.json()) as {
            quote?: BatchInstantQuote
            error?: string
          }
          if (!batchResponse.ok) throw new Error(batchBody.error)
          setBatchQuote(batchBody.quote ?? null)
        }
      })()
        .catch((error) => {
          if (error instanceof DOMException && error.name === "AbortError")
            return
          setActionMessage(
            error instanceof Error ? error.message : "Fiyat hesaplanamadı.",
          )
        })
        .finally(() => setQuoting(false))
    }, 300)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [edition, outputLanguage, quality, selectedChapters, series?.id])

  useEffect(() => {
    if (!selectedChapters.length) return
    qualityStepRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    })
  }, [selectedChapters.length])

  useEffect(() => {
    if (!quality) return
    languageStepRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    })
  }, [quality])

  const chooseSingleChapter = (chapterId: string) => {
    setSelectionMode("single")
    setSelectedChapters(chapterId ? [chapterId] : [])
  }

  const applyRange = (startId: string, endId: string) => {
    if (!edition) return
    const start = edition.chapters.findIndex(
      (chapter) => chapter.id === startId,
    )
    const end = edition.chapters.findIndex((chapter) => chapter.id === endId)
    if (start < 0 || end < 0) {
      setSelectedChapters([])
      return
    }
    const [from, to] = start <= end ? [start, end] : [end, start]
    setSelectedChapters(
      edition.chapters.slice(from, to + 1).map((chapter) => chapter.id),
    )
  }

  const selectRangeBoundary = (
    handle: "start" | "end",
    requestedIndex: number,
  ) => {
    if (!edition?.chapters.length) return
    const currentStart = Math.max(
      0,
      edition.chapters.findIndex((chapter) => chapter.id === rangeStart),
    )
    const currentEndIndex = edition.chapters.findIndex(
      (chapter) => chapter.id === rangeEnd,
    )
    const currentEnd =
      currentEndIndex < 0 ? edition.chapters.length - 1 : currentEndIndex
    const index = Math.max(
      0,
      Math.min(edition.chapters.length - 1, requestedIndex),
    )
    const chapter = edition.chapters[index]
    if (!chapter) return
    let nextStart = handle === "start" ? chapter.id : rangeStart
    let nextEnd = handle === "end" ? chapter.id : rangeEnd
    if (handle === "start") {
      setRangeStart(chapter.id)
      setRangeStartText(chapter.number)
      if (index > currentEnd) {
        nextEnd = chapter.id
        setRangeEnd(chapter.id)
        setRangeEndText(chapter.number)
      }
    } else {
      setRangeEnd(chapter.id)
      setRangeEndText(chapter.number)
      if (index < currentStart) {
        nextStart = chapter.id
        setRangeStart(chapter.id)
        setRangeStartText(chapter.number)
      }
    }
    applyRange(nextStart, nextEnd)
  }

  const selectTypedBoundary = (handle: "start" | "end", value: string) => {
    if (!edition) return false
    const index = edition.chapters.findIndex(
      (chapter) =>
        chapter.number.toLocaleLowerCase("tr") ===
        value.trim().toLocaleLowerCase("tr"),
    )
    if (index < 0) return false
    selectRangeBoundary(handle, index)
    return true
  }

  const rangeStartIndex = edition
    ? Math.max(
        0,
        edition.chapters.findIndex((chapter) => chapter.id === rangeStart),
      )
    : 0
  const foundRangeEndIndex = edition?.chapters.findIndex(
    (chapter) => chapter.id === rangeEnd,
  )
  const rangeEndIndex =
    foundRangeEndIndex === undefined || foundRangeEndIndex < 0
      ? Math.max(0, (edition?.chapters.length ?? 1) - 1)
      : foundRangeEndIndex
  const rangeMaximum = Math.max(0, (edition?.chapters.length ?? 1) - 1)
  const selectedChapterDetails =
    edition?.chapters.filter((chapter) =>
      selectedChapters.includes(chapter.id),
    ) ?? []

  const groups = useMemo(() => {
    if (!series) return []
    const grouped = new Map<
      string,
      {
        language: string
        languageLabel: string
        editions: PublicSourceEdition[]
      }
    >()
    for (const source of series.editions) {
      const existing = grouped.get(source.sourceLanguage)
      if (existing) existing.editions.push(source)
      else
        grouped.set(source.sourceLanguage, {
          language: source.sourceLanguage,
          languageLabel: source.sourceLanguageLabel,
          editions: [source],
        })
    }
    return [...grouped.values()]
  }, [series])
  const fundingCampaigns = campaigns.filter(
    (campaign) => campaign.status === "FUNDING" && campaign.ownCredits > 0,
  )
  const missingCredits =
    authenticated && quote
      ? Math.max(0, quote.remainingCredits - balance)
      : null
  const translationReady = Boolean(
    edition &&
      selectedChapters.length > 0 &&
      quality &&
      outputLanguage &&
      quote &&
      !quoting,
  )
  const visibleOutputLanguages = outputLanguages.filter((language) =>
    language.label
      .toLocaleLowerCase("tr")
      .includes(outputLanguageQuery.trim().toLocaleLowerCase("tr")),
  )
  const sameSettingsRequests = conflictingRequests.filter(
    (request) =>
      request.campaignKind === "community" &&
      request.sameSettings &&
      request.outputLanguage === outputLanguage,
  )
  const differentSettingsRequests = conflictingRequests.filter(
    (request) =>
      request.campaignKind === "community" &&
      !request.sameSettings &&
      request.outputLanguage === outputLanguage,
  )
  const communityRequests = conflictingRequests.filter(
    (request) =>
      request.campaignKind === "community" &&
      request.outputLanguage === outputLanguage,
  )
  const instantRequests = conflictingRequests.filter(
    (request) =>
      request.campaignKind === "instant" &&
      request.outputLanguage === outputLanguage,
  )
  const contributionLimit = quote ? Math.max(0, quote.remainingCredits) : 0
  const allBalanceContribution = Math.min(balance, contributionLimit)
  const validCustomContribution =
    Number.isSafeInteger(Number(customContribution)) &&
    Number(customContribution) > 0 &&
    Number(customContribution) <= contributionLimit

  const submitCampaign = async (
    mode: "community" | "complete",
    credits = 5,
    confirmed = false,
    request?: TranslationRequestConflict,
  ) => {
    if (!authenticated) {
      setAuthPromptOpen(true)
      return
    }
    if (!series || !edition || !quality || !quote) return
    if (!confirmed) {
      setPendingSubmission({ mode, credits, request })
      return
    }
    setActionMessage("Mandown bölümleri indiriyor ve siteye ekliyor…")
    const response = await fetch("/api/translation/campaigns", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        catalogSeriesId: series.id,
        sourceEditionId:
          mode === "community" && request
            ? request.sourceEditionId
            : edition.id,
        chapterIds:
          mode === "community" && request
            ? request.chapterIds
            : selectedChapters,
        qualityTier:
          mode === "community" && request ? request.qualityTier : quality,
        mode,
        credits: mode === "community" ? credits : undefined,
        communityCampaignId:
          mode === "complete" ? request?.campaignId : undefined,
      }),
    })
    const body = (await response.json()) as {
      error?: string
      message?: string
    }
    setActionMessage(
      response.ok
        ? (body.message ?? "Katkınız kaydedildi.")
        : (body.error ?? "İşlem tamamlanamadı."),
    )
    if (response.ok) {
      router.push("/translate/serilerim")
    }
  }

  const selectContribution = (
    credits: number,
    preset: "ten" | "all" | "custom",
  ) => {
    const selected = Math.min(credits, contributionLimit)
    if (!Number.isSafeInteger(selected) || selected < 1) return
    setSelectedContribution(selected)
    setContributionPreset(preset)
    setCustomContributionOpen(false)
    setActionMessage("")
  }

  const beginDirectTranslation = () => {
    if (!translationReady) return
    if (!authenticated) {
      setAuthPromptOpen(true)
      return
    }
    if (selectedChapters.length !== 1) {
      setActionMessage(
        "Anında çeviri tek bölüm içindir. Bu aralık için toplu destek oluşturabilirsiniz.",
      )
      return
    }
    if (instantRequests.length) {
      setActionMessage(
        "Bu bölüm için anında çeviri işi zaten sırada veya çalışıyor.",
      )
      return
    }
    if (communityRequests.length) {
      setTranslationChoiceOpen(true)
      return
    }
    setPendingSubmission({
      mode: "complete",
      credits: quote?.remainingCredits ?? 0,
    })
  }

  const beginBatchTranslation = () => {
    if (!translationReady || !batchQuote) return
    if (!authenticated) {
      setAuthPromptOpen(true)
      return
    }
    batchIdempotencyKey.current = crypto.randomUUID()
    setBatchConfirmationOpen(true)
  }

  const submitBatchTranslation = async () => {
    if (
      !series ||
      !edition ||
      !quality ||
      !batchQuote ||
      batchSubmitting ||
      batchQuote.missingCredits > 0
    )
      return
    setBatchSubmitting(true)
    setActionMessage("Çoklu anında çeviri işleri hazırlanıyor…")
    try {
      const response = await fetch("/api/translation/batches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": batchIdempotencyKey.current,
        },
        body: JSON.stringify({
          catalogSeriesId: series.id,
          sourceEditionId: edition.id,
          chapterIds: selectedChapters,
          qualityTier: quality,
        }),
      })
      const body = (await response.json()) as {
        batch?: BatchInstantResult
        error?: string
        missingCredits?: number
      }
      if (!response.ok || !body.batch)
        throw new Error(body.error ?? "Çoklu anında çeviri başlatılamadı.")
      setBatchConfirmationOpen(false)
      setBatchResult(body.batch)
      setActionMessage("Çoklu anında çeviri işleri başlatıldı.")
    } catch (error) {
      setActionMessage(
        error instanceof Error
          ? error.message
          : "Çoklu anında çeviri başlatılamadı.",
      )
    } finally {
      setBatchSubmitting(false)
    }
  }

  useEffect(() => {
    if (
      !batchResult ||
      ["COMPLETED", "PARTIAL_FAILED", "FAILED"].includes(batchResult.status)
    )
      return
    const timer = window.setInterval(() => {
      void fetch("/api/translation/batches")
        .then(async (response) => {
          const body = (await response.json()) as {
            batches?: BatchInstantResult[]
          }
          const current = body.batches?.find(
            (batch) => batch.id === batchResult.id,
          )
          if (current) setBatchResult(current)
        })
        .catch(() => {
          // Kalıcı takip ekranı erişilebilir; geçici yenileme hatasını sessizce geç.
        })
    }, 3_000)
    return () => window.clearInterval(timer)
  }, [batchResult])

  const pendingCost = pendingSubmission
    ? pendingSubmission.mode === "complete"
      ? (quote?.perChapterCredits ?? 0)
      : Math.min(
          pendingSubmission.credits,
          pendingSubmission.request?.remainingCredits ??
            quote?.remainingCredits ??
            0,
        )
    : 0
  const returnToSearch = () => {
    setSeries(null)
    setEdition(null)
    setSelectedChapters([])
    setStep("source")
    setActionMessage("")
    setSelectingAnilistId(null)
    window.history.replaceState(
      null,
      "",
      query.trim()
        ? `/translate?q=${encodeURIComponent(query.trim())}`
        : "/translate",
    )
  }
  return (
    <div className="grid min-w-0 max-w-full gap-8 overflow-x-clip">
      {series ? (
        <div className="-mb-4 flex px-1 pt-1">
          {step === "source" && detailMode ? (
            <Link
              className="inline-flex min-h-11 items-center gap-2 text-base text-nv-muted-foreground hover:text-foreground"
              href="/translate"
            >
              <ArrowLeft aria-hidden="true" size={19} />
              Aranan serilere dön
            </Link>
          ) : step === "source" ? (
            <button
              className="inline-flex min-h-11 items-center gap-2 text-base text-nv-muted-foreground hover:text-foreground"
              onClick={returnToSearch}
              type="button"
            >
              <ArrowLeft aria-hidden="true" size={19} />
              Aranan serilere dön
            </button>
          ) : (
            <button
              className="inline-flex min-h-11 items-center gap-2 text-base text-nv-muted-foreground hover:text-foreground"
              onClick={() => setStep("source")}
              type="button"
            >
              <ArrowLeft aria-hidden="true" size={19} />
              Kaynağı değiştir
            </button>
          )}
        </div>
      ) : null}
      {!detailMode && !series ? (
        <form
          action="/translate"
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault()
            setActionMessage("")
            const normalized = query.trim()
            immediateSearchQuery.current = normalized
            window.history.pushState(
              null,
              "",
              normalized
                ? `/translate?q=${encodeURIComponent(normalized)}`
                : "/translate",
            )
            void runSearch(normalized)
          }}
        >
          <label className="sr-only" htmlFor="translation-search">
            Seri adı
          </label>
          <div className="relative flex-1">
            <Search
              aria-hidden="true"
              className="-translate-y-1/2 absolute top-1/2 left-4 text-nv-muted-foreground"
              size={19}
            />
            <input
              className="h-13 w-full rounded-lg border border-nv-border bg-surface pr-4 pl-12 outline-none focus:border-nv-primary focus:ring-2 focus:ring-nv-primary/25"
              id="translation-search"
              maxLength={120}
              name="q"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Seri adı veya alternatif adı"
              value={query}
            />
          </div>
          <button
            className="h-13 rounded-lg bg-nv-primary px-7 font-semibold text-nv-primary-foreground hover:opacity-90"
            type="submit"
          >
            Ara
          </button>
        </form>
      ) : null}

      {!detailMode && !series && searching ? (
        <section aria-label="Seriler aranıyor" aria-live="polite">
          <span className="sr-only">Arama sonuçları yükleniyor.</span>
          <div className="grid gap-4">
            {[0, 1].map((item) => (
              <div
                className="grid animate-pulse grid-cols-[76px_minmax(0,1fr)] gap-4 rounded-xl border border-nv-border bg-surface p-4 sm:grid-cols-[112px_minmax(0,1fr)]"
                key={item}
              >
                <span className="aspect-[3/4] rounded-lg bg-surface-raised" />
                <span className="min-w-0 py-1">
                  <span className="block h-5 w-2/3 rounded-full bg-surface-raised" />
                  <span className="mt-3 block h-3 w-full rounded-full bg-surface-raised" />
                  <span className="mt-2 block h-3 w-4/5 rounded-full bg-surface-raised" />
                  <span className="mt-5 flex gap-2">
                    <span className="h-8 w-24 rounded-full bg-surface-raised" />
                    <span className="h-8 w-20 rounded-full bg-surface-raised" />
                  </span>
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : !detailMode && !series && searchError ? (
        <div
          className="rounded-xl border border-nv-border bg-surface p-8 text-center"
          role="alert"
        >
          <CircleHelp className="mx-auto text-nv-muted-foreground" />
          <h2 className="mt-3 font-semibold text-xl">
            {searchRetryAfter ? "Arama sınırına ulaşıldı" : "Arama yapılamadı"}
          </h2>
          <p className="mt-2 text-nv-muted-foreground">{searchError}</p>
          {searchRetryAfter ? (
            <p className="mt-2 text-nv-muted-foreground text-sm">
              Yaklaşık {searchRetryAfter} saniye sonra tekrar deneyebilirsiniz.
            </p>
          ) : null}
          <button
            className="mt-5 min-h-11 rounded-lg border border-nv-border px-5 font-semibold hover:border-nv-primary"
            onClick={() => void runSearch(query)}
            type="button"
          >
            Tekrar dene
          </button>
        </div>
      ) : !detailMode && !series && !query.trim() ? (
        <section>
          <h2 className="font-semibold text-lg">Önerilen seriler</h2>
          <p className="mt-2 text-nv-muted-foreground text-sm">
            AniList kataloğunda seri adıyla arama yapabilirsin.
          </p>
        </section>
      ) : !detailMode &&
        !series &&
        searchComplete &&
        searchResults.length === 0 ? (
        <div className="rounded-xl border border-nv-border bg-surface p-8 text-center">
          <CircleHelp className="mx-auto text-nv-muted-foreground" />
          <h2 className="mt-3 font-semibold text-xl">Sonuç bulunamadı</h2>
          <p className="mt-2 text-nv-muted-foreground">
            Başka bir seri adı veya alternatif ad deneyin.
          </p>
        </div>
      ) : !detailMode && !series && searchResults.length > 0 ? (
        <section aria-labelledby="search-results">
          <h2 className="font-semibold text-xl" id="search-results">
            Arama sonuçları
          </h2>
          <div className="mt-4 grid gap-4">
            {searchResults.map((item) => (
              <a
                aria-disabled={selectingAnilistId !== null}
                className="group grid min-w-0 cursor-pointer grid-cols-[76px_minmax(0,1fr)] gap-4 rounded-xl border border-nv-border bg-surface p-4 text-left hover:border-nv-primary hover:shadow-lg aria-disabled:cursor-wait aria-disabled:opacity-70 sm:grid-cols-[112px_minmax(0,1fr)] sm:gap-5"
                draggable={false}
                href="/translate"
                key={item.anilistId}
                onClick={(event) => {
                  event.preventDefault()
                  if (
                    selectingAnilistId !== null ||
                    window.getSelection()?.toString().trim()
                  )
                    return
                  void selectSearchResult(item)
                }}
                onKeyDown={(event) => {
                  if (selectingAnilistId !== null || event.key !== " ") return
                  event.preventDefault()
                  void selectSearchResult(item)
                }}
                onDragStart={(event) => event.preventDefault()}
                tabIndex={selectingAnilistId === null ? 0 : -1}
              >
                <span className="relative aspect-[3/4] w-[76px] shrink-0 overflow-hidden rounded-lg bg-surface-raised sm:w-28">
                  <Image
                    alt={`${item.title.english ?? item.title.romaji ?? item.title.native ?? "AniList serisi"} kapağı`}
                    className="object-cover"
                    draggable={false}
                    fill
                    sizes="(min-width: 640px) 112px, 76px"
                    src={item.cover ?? "/placeholders/series-cover.svg"}
                    unoptimized={Boolean(item.cover)}
                  />
                </span>
                <div className="min-w-0">
                  <span className="flex items-start justify-between gap-3">
                    <h3 className="cursor-text select-text font-bold text-xl">
                      {item.title.english ??
                        item.title.romaji ??
                        item.title.native ??
                        `AniList #${item.anilistId}`}
                    </h3>
                    {selectingAnilistId === item.anilistId ? (
                      <LoaderCircle
                        aria-label="Seri ayrıntıları yükleniyor"
                        className="mt-1 shrink-0 animate-spin"
                        size={19}
                      />
                    ) : null}
                  </span>
                  <dl className="mt-2 grid gap-1 text-nv-muted-foreground text-sm">
                    {(
                      [
                        ["English", item.title.english],
                        ["Romaji", item.title.romaji],
                        ["Native", item.title.native],
                      ] as const
                    ).map(([label, value]) =>
                      value ? (
                        <div
                          className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-2"
                          key={label}
                        >
                          <dt>{label}</dt>
                          <dd className="cursor-text select-text truncate text-foreground">
                            {value}
                          </dd>
                        </div>
                      ) : null,
                    )}
                  </dl>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.publicationStatus ? (
                      <span className="rounded-full border border-nv-border px-3 py-2 text-sm hover:border-nv-primary">
                        {searchStatusLabels[item.publicationStatus] ??
                          item.publicationStatus}
                      </span>
                    ) : null}
                    {item.format ? (
                      <span className="rounded-full border border-nv-border px-3 py-2 text-sm hover:border-nv-primary">
                        {searchFormatLabels[item.format] ?? item.format}
                      </span>
                    ) : null}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      {series ? (
        <section className="grid min-w-0 items-start gap-6 overflow-x-clip lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid min-w-0 gap-6">
            <div className="grid min-w-0 max-w-full grid-cols-[76px_minmax(0,1fr)] gap-4 overflow-hidden rounded-xl border border-nv-border bg-surface p-4 sm:grid-cols-[112px_minmax(0,1fr)] sm:gap-5 sm:p-5">
              <span className="relative aspect-[3/4] w-[76px] shrink-0 overflow-hidden rounded-lg bg-surface-raised sm:w-28">
                <Image
                  alt={`${series.title} kapağı`}
                  className="object-cover"
                  fill
                  priority
                  sizes="(min-width: 640px) 112px, 76px"
                  src={series.cover}
                  unoptimized={series.cover.startsWith("/api/")}
                />
              </span>
              <div className="min-w-0">
                <h1 className="select-text font-bold text-3xl">
                  {series.title}
                </h1>
                <p className="mt-2 text-nv-muted-foreground">
                  {series.description}
                </p>
              </div>
            </div>
            <AnimatePresence initial={false} mode="wait">
              {step === "source" ? (
                <motion.div
                  animate={{ x: 0, opacity: 1 }}
                  className="grid min-w-0 max-w-full gap-6"
                  exit={{ x: -30, opacity: 0 }}
                  initial={{ x: -30, opacity: 0 }}
                  key="source"
                  transition={{ duration: 0.2 }}
                >
                  <div>
                    <h2 className="font-bold text-2xl">Kaynak seç</h2>
                    <p className="mt-1 text-nv-muted-foreground">
                      Bölüm listesini görmek için bir kaynak seç.
                    </p>
                  </div>
                  {groups.length ? (
                    groups.map((group) => (
                      <div key={group.language}>
                        <h3 className="font-semibold">
                          {group.languageLabel} kaynaklar
                        </h3>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          {group.editions.map((source) => (
                            <div
                              className="min-w-0 rounded-xl border border-nv-border bg-surface p-4 hover:border-nv-primary sm:p-5"
                              key={source.id}
                            >
                              <span className="flex min-w-0 items-center justify-between gap-3">
                                <span className="flex min-w-0 items-center gap-2 font-semibold">
                                  <button
                                    className="truncate text-left hover:text-nv-primary"
                                    onClick={() =>
                                      void chooseEdition(source, series)
                                    }
                                    type="button"
                                  >
                                    {source.publicSourceLabel}
                                  </button>
                                  <SourceInfoPopover
                                    description={source.description}
                                    label={source.publicSourceLabel}
                                  />
                                </span>
                                {loadingSourceIds.has(source.id) ? (
                                  <LoaderCircle
                                    aria-label={`${source.publicSourceLabel} bölümleri yükleniyor`}
                                    className="animate-spin"
                                    size={18}
                                  />
                                ) : null}
                              </span>
                              <button
                                aria-label={`${source.publicSourceLabel} kaynağını seç`}
                                className="mt-3 block w-full text-left"
                                onClick={() =>
                                  void chooseEdition(source, series)
                                }
                                type="button"
                              >
                                <span className="grid grid-cols-2 gap-3 text-sm">
                                  <span className="rounded-lg bg-surface-raised p-3">
                                    <span className="block text-nv-muted-foreground text-xs">
                                      Mevcut bölümler
                                    </span>
                                    <span className="mt-1 flex min-h-5 items-center font-semibold">
                                      {loadingSourceIds.has(source.id) ||
                                      (!source.chaptersLoaded &&
                                        !sourceErrors[source.id]) ? (
                                        <LoaderCircle
                                          aria-label={`${source.publicSourceLabel} mevcut bölümler yükleniyor`}
                                          className="animate-spin"
                                          size={16}
                                        />
                                      ) : (
                                        source.chapterCount
                                      )}
                                    </span>
                                  </span>
                                  <span className="rounded-lg bg-surface-raised p-3">
                                    <span className="block text-nv-muted-foreground text-xs">
                                      Son bölüm
                                    </span>
                                    <span className="mt-1 flex min-h-5 items-center font-semibold">
                                      {loadingSourceIds.has(source.id) ||
                                      (!source.chaptersLoaded &&
                                        !sourceErrors[source.id]) ? (
                                        <LoaderCircle
                                          aria-label={`${source.publicSourceLabel} son bölüm yükleniyor`}
                                          className="animate-spin"
                                          size={16}
                                        />
                                      ) : (
                                        source.lastChapterNumber
                                      )}
                                    </span>
                                  </span>
                                </span>
                                {sourceErrors[source.id] ? (
                                  <span className="mt-3 block text-nv-warning text-sm">
                                    {sourceErrors[source.id]} Tekrar denemek
                                    için kaynağı seç.
                                  </span>
                                ) : null}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-nv-border bg-surface p-6">
                      <h3 className="font-semibold">
                        Bu seri için kaynak bulunamadı
                      </h3>
                      <p className="mt-2 text-nv-muted-foreground text-sm">
                        Bu seri için indirilebilir kaynak talebinde{" "}
                        <Link
                          className="font-semibold text-nv-primary hover:underline"
                          href="/translate/kaynak-talebi"
                        >
                          Buradan
                        </Link>{" "}
                        bulunabilirsiniz.
                      </p>
                    </div>
                  )}
                </motion.div>
              ) : edition ? (
                <motion.div
                  animate={{ x: 0, opacity: 1 }}
                  className="grid min-w-0 max-w-full gap-6"
                  exit={{ x: 30, opacity: 0 }}
                  initial={{ x: 30, opacity: 0 }}
                  key="chapters"
                  transition={{ duration: 0.2 }}
                >
                  <div>
                    <h2 className="font-bold text-2xl">AI çeviri seçimi</h2>
                    <p className="mt-1 text-nv-muted-foreground">
                      Önce bölümü seç; kalite ve çıktı dili adımları sırayla
                      açılacak. {edition.publicSourceLabel} ·{" "}
                      {edition.chapterCount} bölüm
                    </p>
                  </div>

                  <fieldset className="min-w-0">
                    <legend className="font-semibold text-lg">
                      1. Bölüm seçimi
                    </legend>
                    <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-surface-raised p-1">
                      {(["single", "range"] as const).map((mode) => (
                        <button
                          className="rounded-md px-4 py-2 font-semibold text-sm data-[selected=true]:bg-surface data-[selected=true]:shadow"
                          data-selected={selectionMode === mode}
                          key={mode}
                          onClick={() => {
                            setSelectionMode(mode)
                            if (mode === "single")
                              chooseSingleChapter(
                                selectedChapters[0] ??
                                  edition.chapters[0]?.id ??
                                  "",
                              )
                            else applyRange(rangeStart, rangeEnd)
                          }}
                          type="button"
                        >
                          {mode === "single" ? "Tek bölüm" : "Bölüm aralığı"}
                        </button>
                      ))}
                    </div>
                    {selectionMode === "single" ? (
                      <label className="mt-4 grid gap-2 font-medium text-sm">
                        Çevrilecek bölüm
                        <select
                          className="h-12 w-full min-w-0 max-w-full rounded-lg border border-nv-border bg-surface px-3"
                          onChange={(event) =>
                            chooseSingleChapter(event.target.value)
                          }
                          value={selectedChapters[0] ?? ""}
                        >
                          <option value="">Bölüm seç</option>
                          {edition.chapters.map((chapter) => (
                            <option key={chapter.id} value={chapter.id}>
                              Bölüm {chapter.number}
                              {chapter.title ? ` · ${chapter.title}` : ""}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <div className="mt-4">
                        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                          <label className="grid gap-2 font-medium text-sm">
                            Başlangıç bölümü
                            <input
                              className="h-12 min-w-0 rounded-xl border border-nv-border bg-surface px-3"
                              inputMode="decimal"
                              onBlur={(event) => {
                                if (
                                  !selectTypedBoundary(
                                    "start",
                                    event.currentTarget.value,
                                  )
                                )
                                  setRangeStartText(
                                    edition.chapters[rangeStartIndex]?.number ??
                                      "",
                                  )
                              }}
                              onChange={(event) => {
                                setRangeStartText(event.target.value)
                                selectTypedBoundary("start", event.target.value)
                              }}
                              value={rangeStartText}
                            />
                          </label>
                          <label className="grid gap-2 font-medium text-sm">
                            Bitiş bölümü
                            <input
                              className="h-12 min-w-0 rounded-xl border border-nv-border bg-surface px-3"
                              inputMode="decimal"
                              onBlur={(event) => {
                                if (
                                  !selectTypedBoundary(
                                    "end",
                                    event.currentTarget.value,
                                  )
                                )
                                  setRangeEndText(
                                    edition.chapters[rangeEndIndex]?.number ??
                                      "",
                                  )
                              }}
                              onChange={(event) => {
                                setRangeEndText(event.target.value)
                                selectTypedBoundary("end", event.target.value)
                              }}
                              value={rangeEndText}
                            />
                          </label>
                        </div>
                        <div className="relative mt-12 h-12 min-w-0">
                          <div className="absolute top-4 right-2 left-2 h-2 rounded-full bg-surface-raised" />
                          <div
                            className="absolute top-4 h-2 rounded-full bg-nv-primary"
                            style={{
                              left: `${(rangeStartIndex / Math.max(1, rangeMaximum)) * 100}%`,
                              right: `${100 - (rangeEndIndex / Math.max(1, rangeMaximum)) * 100}%`,
                            }}
                          />
                          {(["start", "end"] as const).map((handle) => {
                            const index =
                              handle === "start"
                                ? rangeStartIndex
                                : rangeEndIndex
                            const chapter = edition.chapters[index]
                            return activeRangeHandle === handle && chapter ? (
                              <output
                                className="-translate-x-1/2 absolute bottom-10 z-30 min-w-32 rounded-xl border border-nv-border bg-surface px-3 py-2 text-center shadow-xl"
                                key={`${handle}-tooltip`}
                                style={{
                                  left: `clamp(4rem, ${
                                    (index / Math.max(1, rangeMaximum)) * 100
                                  }%, calc(100% - 4rem))`,
                                }}
                              >
                                <strong className="block text-sm">
                                  Bölüm {chapter.number}
                                </strong>
                                <span className="mt-0.5 block truncate text-nv-muted-foreground text-xs">
                                  {chapter.title ?? "Bölüm adı yok"}
                                </span>
                              </output>
                            ) : null
                          })}
                          <input
                            aria-label="Başlangıç bölümünü kaydır"
                            className={`chapter-range-input absolute inset-x-0 top-0 h-10 w-full focus:outline-none focus-visible:outline-none ${
                              rangeStartIndex === rangeEndIndex
                                ? "z-10"
                                : "z-20"
                            }`}
                            max={rangeMaximum}
                            min={0}
                            onBlur={() => setActiveRangeHandle(null)}
                            onChange={(event) =>
                              selectRangeBoundary(
                                "start",
                                Number(event.target.value),
                              )
                            }
                            onFocus={() => setActiveRangeHandle("start")}
                            onPointerDown={() => setActiveRangeHandle("start")}
                            onPointerUp={() => setActiveRangeHandle(null)}
                            step={1}
                            type="range"
                            value={rangeStartIndex}
                          />
                          <input
                            aria-label="Bitiş bölümünü kaydır"
                            className="chapter-range-input absolute inset-x-0 top-0 z-20 h-10 w-full focus:outline-none focus-visible:outline-none"
                            max={rangeMaximum}
                            min={0}
                            onBlur={() => setActiveRangeHandle(null)}
                            onChange={(event) =>
                              selectRangeBoundary(
                                "end",
                                Number(event.target.value),
                              )
                            }
                            onFocus={() => setActiveRangeHandle("end")}
                            onPointerDown={() => setActiveRangeHandle("end")}
                            onPointerUp={() => setActiveRangeHandle(null)}
                            step={1}
                            type="range"
                            value={rangeEndIndex}
                          />
                        </div>
                        <div className="mt-1 flex justify-between gap-4 text-nv-muted-foreground text-xs">
                          <span>
                            Başlangıç · Bölüm{" "}
                            {edition.chapters[rangeStartIndex]?.number}
                          </span>
                          <span className="text-right">
                            Bitiş · Bölüm{" "}
                            {edition.chapters[rangeEndIndex]?.number}
                          </span>
                        </div>
                        <div className="mt-3 rounded-lg border border-nv-border bg-surface-raised p-3 text-sm">
                          <p className="font-semibold">
                            Bölüm {selectedChapterDetails[0]?.number ?? "—"}–
                            {selectedChapterDetails.at(-1)?.number ?? "—"}{" "}
                            seçildi
                          </p>
                          <p className="mt-1 text-nv-muted-foreground">
                            Başlangıç ve bitiş dahil, aradaki tüm bölümler
                            çevrilecek.
                          </p>
                          <p className="mt-2 font-medium">
                            Çevrilecek bölümler:{" "}
                            {compactChapterNumbers(
                              selectedChapterDetails.map(
                                (chapter) => chapter.number,
                              ),
                            ) || "Henüz bölüm seçilmedi"}
                          </p>
                        </div>
                      </div>
                    )}
                  </fieldset>

                  <AnimatePresence initial={false}>
                    {selectedChapters.length ? (
                      <motion.div
                        animate={{ opacity: 1, y: 0 }}
                        initial={{ opacity: 0, y: -16 }}
                        key="quality-step"
                        layout
                        ref={qualityStepRef}
                        transition={{ duration: 0.22 }}
                      >
                        <fieldset className="min-w-0">
                          <legend className="font-semibold text-lg">
                            2. AI çeviri kalitesi
                          </legend>
                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            {(["balanced", "premium"] as const).map((tier) => (
                              <button
                                aria-pressed={quality === tier}
                                className="rounded-xl border border-nv-border bg-surface p-4 text-left data-[selected=true]:border-nv-primary data-[selected=true]:ring-2 data-[selected=true]:ring-nv-primary/20"
                                data-selected={quality === tier}
                                key={tier}
                                onClick={() => setQuality(tier)}
                                type="button"
                              >
                                <span className="flex items-center gap-2 font-bold">
                                  <Sparkles
                                    className={
                                      tier === "premium"
                                        ? "text-nv-warning"
                                        : "text-nv-primary"
                                    }
                                    size={18}
                                  />
                                  {tier === "premium"
                                    ? "Premium AI"
                                    : "Dengeli AI"}
                                </span>
                                <span className="mt-2 block text-nv-muted-foreground text-sm">
                                  {tier === "premium"
                                    ? "Daha güçlü AI modeli ve daha yüksek kalite hedefi."
                                    : "Ekonomik, hızlı ve doğal AI çevirisi."}
                                </span>
                              </button>
                            ))}
                          </div>
                        </fieldset>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>

                  <AnimatePresence initial={false}>
                    {quality ? (
                      <motion.div
                        animate={{ opacity: 1, y: 0 }}
                        initial={{ opacity: 0, y: -16 }}
                        key="language-step"
                        layout
                        ref={languageStepRef}
                        transition={{ duration: 0.22 }}
                      >
                        <fieldset className="min-w-0">
                          <legend className="font-semibold text-lg">
                            3. Çıktı dili
                          </legend>
                          <p className="mt-1 text-nv-muted-foreground text-sm">
                            Profilindeki çeviri dili önceden seçilir. Arayüz
                            dilinden bağımsızdır.
                          </p>
                          <label className="relative mt-3 block">
                            <span className="sr-only">Çıktı dili ara</span>
                            <Search
                              aria-hidden="true"
                              className="-translate-y-1/2 absolute top-1/2 left-4 text-nv-muted-foreground"
                              size={17}
                            />
                            <input
                              className="h-11 w-full min-w-0 rounded-lg border border-nv-border bg-surface pr-4 pl-11"
                              onChange={(event) =>
                                setOutputLanguageQuery(event.target.value)
                              }
                              placeholder="Çıktı dili ara"
                              type="search"
                              value={outputLanguageQuery}
                            />
                          </label>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {visibleOutputLanguages.map((language) => (
                              <button
                                aria-pressed={outputLanguage === language.code}
                                className="flex min-h-12 items-center gap-3 rounded-xl border border-nv-border px-4 font-semibold aria-pressed:border-nv-primary aria-pressed:bg-nv-primary/10"
                                key={language.code}
                                onClick={() => setOutputLanguage(language.code)}
                                type="button"
                              >
                                <span aria-hidden="true" className="text-xl">
                                  {language.flag}
                                </span>
                                {language.label}
                              </button>
                            ))}
                          </div>
                        </fieldset>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          {edition && step === "chapters" ? (
            <aside className="min-w-0 rounded-xl border border-nv-border bg-surface p-4 shadow-xl sm:p-5 lg:sticky lg:top-24">
              <h2 className="font-bold text-xl">AI çeviri talebi</h2>
              <dl className="mt-4 grid gap-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-nv-muted-foreground">Kaynak</dt>
                  <dd>{edition.publicSourceLabel}</dd>
                </div>
                {selectedChapters.length ? (
                  <motion.div
                    animate={{ opacity: 1, x: 0 }}
                    className="flex justify-between gap-4"
                    initial={{ opacity: 0, x: 12 }}
                  >
                    <dt className="text-nv-muted-foreground">Bölüm</dt>
                    <dd>{selectedChapters.length} bölüm</dd>
                  </motion.div>
                ) : null}
                {quality ? (
                  <motion.div
                    animate={{ opacity: 1, x: 0 }}
                    className="flex justify-between gap-4"
                    initial={{ opacity: 0, x: 12 }}
                  >
                    <dt className="text-nv-muted-foreground">AI kalitesi</dt>
                    <dd>{quality === "premium" ? "Premium" : "Dengeli"}</dd>
                  </motion.div>
                ) : null}
                {quality && outputLanguage ? (
                  <motion.div
                    animate={{ opacity: 1, x: 0 }}
                    className="flex justify-between gap-4"
                    initial={{ opacity: 0, x: 12 }}
                  >
                    <dt className="text-nv-muted-foreground">Çıktı dili</dt>
                    <dd className="flex items-center gap-1">
                      <Languages size={15} /> 🇹🇷 Türkçe
                    </dd>
                  </motion.div>
                ) : null}
                {quote ? (
                  <>
                    <div className="flex justify-between gap-4">
                      <dt className="text-nv-muted-foreground">Bakiyen</dt>
                      <dd>
                        {authenticated ? `${balance} kredi` : "Giriş gerekli"}
                      </dd>
                    </div>
                    <div
                      className={`flex justify-between gap-4 ${
                        missingCredits && missingCredits > 0
                          ? "text-danger"
                          : "text-foreground"
                      }`}
                    >
                      <dt>Eksik kredi</dt>
                      <dd>
                        {missingCredits === null ? (
                          "—"
                        ) : (
                          <strong>
                            {formatCredits.format(missingCredits)} kredi
                          </strong>
                        )}
                      </dd>
                    </div>
                  </>
                ) : null}
              </dl>
              {selectedChapterDetails.length ? (
                <div className="mt-4 rounded-lg bg-surface-raised p-3 text-sm">
                  <p className="font-semibold">
                    Çevrilecek{" "}
                    {selectedChapterDetails.length === 1 ? "bölüm" : "bölümler"}
                  </p>
                  <p className="mt-1 text-nv-muted-foreground">
                    Bölüm{" "}
                    {compactChapterNumbers(
                      selectedChapterDetails.map((chapter) => chapter.number),
                    )}
                    {selectionMode === "range"
                      ? " · Başlangıç ve bitiş dahil"
                      : ""}
                  </p>
                </div>
              ) : null}
              <div className="mt-5 border-nv-border border-t pt-5">
                <p className="flex items-center justify-between font-bold">
                  Talebi tamamlamak için gereken
                  <span className="flex items-center gap-1 text-xl">
                    {quoting ? (
                      <LoaderCircle className="animate-spin" size={18} />
                    ) : quote ? (
                      formatCredits.format(quote.remainingCredits)
                    ) : (
                      "Adımları tamamla"
                    )}
                    {quote ? <Coins size={19} /> : null}
                  </span>
                </p>
              </div>
              <p className="mt-4 text-nv-muted-foreground text-xs">
                Bu bir AI çeviri talebidir. Mevcut geçici aşamada kaynak
                bölümleri Mandown ile indirilip CBZ hazırlanarak doğrudan Novora
                okuyucusuna eklenir.
              </p>
              {existingTranslations.length ? (
                <div className="mt-4 rounded-lg border border-nv-warning/50 bg-nv-warning/10 p-3 text-sm">
                  <strong>
                    {existingTranslations.length} seçili bölümün çevirisi zaten
                    var.
                  </strong>
                  <p className="mt-1 text-nv-muted-foreground">
                    Talebi gönderirken yeniden çevirmeyi onaylaman istenecek.
                  </p>
                </div>
              ) : null}
              {conflictingRequests.length ? (
                <div
                  className="mt-4 rounded-lg border border-nv-warning bg-nv-warning/10 p-3 text-sm"
                  role="alert"
                >
                  <strong>Benzer çeviri talepleri var.</strong>
                  <ul className="mt-2 grid gap-1">
                    {conflictingRequests.map((request) => (
                      <li key={request.campaignId}>
                        Bölüm {compactChapterNumbers(request.chapterNumbers)}{" "}
                        için{" "}
                        {request.qualityTier === "premium"
                          ? "Premium"
                          : "Dengeli"}{" "}
                        kalitede, {request.sourceLabel} kaynaklı bir çeviri
                        talebi zaten var. Toplanan:{" "}
                        {formatCredits.format(request.fundedCredits)}/
                        {formatCredits.format(request.targetCredits)} kredi.
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="mt-5 grid min-w-0 gap-2">
                <button
                  aria-pressed={contributionPreset === "ten"}
                  className="min-h-11 rounded-lg border border-nv-border px-3 font-semibold text-sm disabled:opacity-50 aria-pressed:border-nv-primary aria-pressed:bg-nv-primary-soft"
                  disabled={!translationReady || contributionLimit < 1}
                  onClick={() => selectContribution(10, "ten")}
                  type="button"
                >
                  +10 ekle
                </button>
                <button
                  aria-pressed={contributionPreset === "all"}
                  className="min-h-11 rounded-lg border border-nv-border px-3 font-semibold text-sm disabled:opacity-50 aria-pressed:border-nv-primary aria-pressed:bg-nv-primary-soft"
                  disabled={!translationReady || allBalanceContribution < 1}
                  onClick={() =>
                    selectContribution(allBalanceContribution, "all")
                  }
                  type="button"
                >
                  + Tüm bakiyemi ekle
                </button>
                <button
                  aria-expanded={customContributionOpen}
                  aria-pressed={contributionPreset === "custom"}
                  className="min-h-11 rounded-lg border border-nv-border px-3 font-semibold text-sm disabled:opacity-50 aria-pressed:border-nv-primary aria-pressed:bg-nv-primary-soft"
                  disabled={!translationReady || contributionLimit < 1}
                  onClick={() =>
                    setCustomContributionOpen((current) => !current)
                  }
                  type="button"
                >
                  Özel tutar belirle
                </button>
                {customContributionOpen ? (
                  <div className="grid min-w-0 gap-2 rounded-lg bg-surface sm:grid-cols-[minmax(0,1fr)_auto]">
                    <label className="sr-only" htmlFor="custom-contribution">
                      Özel kredi tutarı
                    </label>
                    <input
                      className="min-h-12 min-w-0 appearance-none rounded-lg border border-nv-border bg-background px-3 outline-none focus:border-nv-primary focus:ring-2 focus:ring-nv-primary/20"
                      id="custom-contribution"
                      inputMode="numeric"
                      max={contributionLimit}
                      min={1}
                      onChange={(event) =>
                        setCustomContribution(event.target.value)
                      }
                      placeholder="Kredi miktarı"
                      type="number"
                      value={customContribution}
                    />
                    <button
                      className="rounded-lg bg-nv-primary px-4 py-3 font-semibold text-nv-primary-foreground disabled:opacity-50"
                      disabled={!translationReady || !validCustomContribution}
                      onClick={() =>
                        selectContribution(Number(customContribution), "custom")
                      }
                      type="button"
                    >
                      Seç
                    </button>
                  </div>
                ) : null}
                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                  <button
                    className="min-h-12 rounded-lg border border-nv-primary px-4 py-3 font-semibold disabled:opacity-50"
                    disabled={
                      !translationReady ||
                      selectedContribution === null ||
                      selectedContribution < 1 ||
                      selectedContribution > contributionLimit
                    }
                    onClick={() =>
                      void submitCampaign(
                        "community",
                        selectedContribution ?? 0,
                      )
                    }
                    type="button"
                  >
                    Yeni topluluk talebi
                    {selectedContribution
                      ? ` · ${formatCredits.format(selectedContribution)} kredi`
                      : ""}
                  </button>
                  <SourceInfoPopover
                    align="end"
                    ariaLabel="Yeni topluluk talebi nasıl çalışır?"
                    description="Bu serinin çevrilmesi için topluluktan yardım al. Herkes kredi ekleyebilir; hedef kredi tamamlandığında AI çevirisi başlar."
                    label="Yeni topluluk talebi"
                  />
                </div>
                {selectedChapters.length === 1 ? (
                  <button
                    className="rounded-lg bg-nv-primary px-4 py-3 font-semibold text-nv-primary-foreground disabled:opacity-50"
                    disabled={!translationReady}
                    onClick={beginDirectTranslation}
                    type="button"
                  >
                    Bu Bölümü Şimdi Çevir
                    {quote
                      ? ` · ${formatCredits.format(quote.perChapterCredits)} kredi`
                      : ""}
                  </button>
                ) : (
                  <div className="grid gap-2">
                    <button
                      className="rounded-lg bg-nv-primary px-4 py-3 font-semibold text-nv-primary-foreground disabled:opacity-50"
                      disabled={
                        !translationReady ||
                        !batchQuote ||
                        batchQuote.eligibleCount === 0
                      }
                      onClick={beginBatchTranslation}
                      type="button"
                    >
                      Seçili Bölümleri Şimdi Çevir
                      {batchQuote
                        ? ` · ${formatCredits.format(batchQuote.totalCredits)} kredi`
                        : ""}
                    </button>
                    {batchQuote?.excludedCount ? (
                      <p className="rounded-lg bg-surface-raised p-3 text-nv-muted-foreground text-sm">
                        {batchQuote.eligibleCount} bölüm uygun,{" "}
                        {batchQuote.excludedCount} bölüm işlemden çıkarılacak.
                      </p>
                    ) : null}
                  </div>
                )}
                {authenticated && quote && balance < quote.remainingCredits ? (
                  <button
                    className="rounded-lg border border-danger px-4 py-3 font-semibold text-danger"
                    disabled
                    title="Kredi marketi yakında açılacak. Seçiminiz bu sayfada korunur."
                    type="button"
                  >
                    Kredi satın al · yakında
                  </button>
                ) : null}
              </div>
              {actionMessage ? (
                <p aria-live="polite" className="mt-3 text-sm">
                  {actionMessage}
                </p>
              ) : null}
              {fundingCampaigns.length ? (
                <div className="mt-5 border-nv-border border-t pt-4">
                  <h3 className="font-semibold">Desteklediğin bölümler</h3>
                  <div className="mt-3 grid gap-3">
                    {fundingCampaigns.slice(0, 3).map((campaign) => {
                      const percentage = Math.min(
                        100,
                        Math.round(
                          (campaign.fundedCredits / campaign.targetCredits) *
                            100,
                        ),
                      )
                      return (
                        <article className="text-sm" key={campaign.id}>
                          <p className="flex justify-between gap-2">
                            <strong>
                              {campaign.chapterIds.length} bölüm ·{" "}
                              {campaign.qualityTier === "premium"
                                ? "Premium"
                                : "Dengeli"}
                            </strong>
                            <span>{campaign.status}</span>
                          </p>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-raised">
                            <span
                              className="block h-full bg-nv-primary"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <p className="mt-1 text-nv-muted-foreground text-xs">
                            {campaign.fundedCredits}/{campaign.targetCredits}{" "}
                            kredi · {campaign.contributorCount} katkı · Senin
                            katkın {campaign.ownCredits}
                          </p>
                          <p className="mt-0.5 text-nv-muted-foreground text-xs">
                            AI çevirisinin başlamasına{" "}
                            <strong>
                              {formatCredits.format(
                                Math.max(
                                  0,
                                  campaign.targetCredits -
                                    campaign.fundedCredits,
                                ),
                              )}{" "}
                              kredi
                            </strong>{" "}
                            kaldı.
                          </p>
                        </article>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </aside>
          ) : null}
        </section>
      ) : null}
      {translationChoiceOpen ? (
        <div
          aria-labelledby="translation-choice-title"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-nv-background/80 p-4 backdrop-blur-sm"
          role="dialog"
        >
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="my-auto w-full max-w-xl rounded-xl border border-nv-border bg-surface p-5 shadow-2xl sm:p-6"
            initial={{ opacity: 0, scale: 0.97, y: 16 }}
          >
            <h2 className="font-bold text-xl" id="translation-choice-title">
              Bu bölüm toplu bir talebe dahil
            </h2>
            <p className="mt-2 text-nv-muted-foreground text-sm">
              Toplu desteğe katılabilir veya toplu talebi engellemeden bu bölümü
              seçtiğin ayarlarla hemen çevirebilirsin.
            </p>
            <div className="mt-5 grid gap-3">
              {communityRequests.map((request) => (
                <article
                  className="rounded-xl border border-nv-border bg-background p-4"
                  key={request.campaignId}
                >
                  <p className="font-semibold">
                    Bölüm {compactChapterNumbers(request.chapterNumbers)}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <section className="min-w-0 rounded-lg bg-surface-raised p-3">
                      <h3 className="font-semibold text-nv-muted-foreground text-xs uppercase tracking-wide">
                        Mevcut talep
                      </h3>
                      <dl className="mt-2 grid gap-2">
                        <div>
                          <dt className="text-nv-muted-foreground text-xs">
                            Kaynak
                          </dt>
                          <dd className="truncate font-semibold">
                            {request.sourceLabel}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-nv-muted-foreground text-xs">
                            Kalite
                          </dt>
                          <dd className="font-semibold">
                            {request.qualityTier === "premium"
                              ? "Premium"
                              : "Dengeli"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-nv-muted-foreground text-xs">
                            Çıktı dili
                          </dt>
                          <dd className="font-semibold">Türkçe</dd>
                        </div>
                        <div>
                          <dt className="text-nv-muted-foreground text-xs">
                            Toplanan
                          </dt>
                          <dd className="font-semibold">
                            {formatCredits.format(request.fundedCredits)}/
                            {formatCredits.format(request.targetCredits)}
                          </dd>
                        </div>
                      </dl>
                    </section>
                    <section className="min-w-0 rounded-lg border border-nv-primary bg-nv-primary-soft p-3">
                      <h3 className="font-semibold text-nv-primary text-xs uppercase tracking-wide">
                        Senin seçimin
                      </h3>
                      <dl className="mt-2 grid gap-2">
                        <div>
                          <dt className="text-nv-muted-foreground text-xs">
                            Kaynak
                          </dt>
                          <dd className="truncate font-semibold">
                            {edition?.publicSourceLabel}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-nv-muted-foreground text-xs">
                            Kalite
                          </dt>
                          <dd className="font-semibold">
                            {quality === "premium" ? "Premium" : "Dengeli"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-nv-muted-foreground text-xs">
                            Çıktı dili
                          </dt>
                          <dd className="font-semibold">Türkçe</dd>
                        </div>
                        <div>
                          <dt className="text-nv-muted-foreground text-xs">
                            Maliyet
                          </dt>
                          <dd className="font-semibold">
                            {formatCredits.format(quote?.remainingCredits ?? 0)}{" "}
                            kredi
                          </dd>
                        </div>
                      </dl>
                    </section>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <button
                      className="rounded-lg border border-nv-primary px-4 py-3 font-semibold disabled:opacity-50"
                      disabled={request.remainingCredits < 1}
                      onClick={() => {
                        setTranslationChoiceOpen(false)
                        setPendingSubmission({
                          mode: "community",
                          credits: Math.min(
                            selectedContribution ?? 10,
                            request.remainingCredits,
                          ),
                          request,
                        })
                      }}
                      type="button"
                    >
                      Toplu Desteğe Katıl
                    </button>
                    <button
                      className="rounded-lg bg-nv-primary px-4 py-3 font-semibold text-nv-primary-foreground"
                      onClick={() => {
                        setTranslationChoiceOpen(false)
                        setPendingSubmission({
                          mode: "complete",
                          credits: quote?.perChapterCredits ?? 0,
                          request,
                        })
                      }}
                      type="button"
                    >
                      Bu Bölümü Şimdi Çevir
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <div className="mt-5">
              <button
                className="w-full rounded-lg border border-nv-border px-4 py-3 font-semibold"
                onClick={() => setTranslationChoiceOpen(false)}
                type="button"
              >
                Vazgeç
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
      {batchConfirmationOpen && batchQuote ? (
        <div
          aria-labelledby="batch-translation-confirmation-title"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-nv-background/80 p-4 backdrop-blur-sm"
          role="dialog"
        >
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="my-auto w-full max-w-lg rounded-xl border border-nv-border bg-surface p-5 shadow-2xl sm:p-6"
            initial={{ opacity: 0, scale: 0.97, y: 16 }}
          >
            <h2
              className="font-bold text-xl"
              id="batch-translation-confirmation-title"
            >
              Çoklu anında çeviriyi onayla
            </h2>
            <p className="mt-2 text-nv-muted-foreground text-sm">
              Sunucu her bölümü yeniden doğrular. Uygun bölümler tek ödemeyle
              ayrı ayrı sıraya alınır.
            </p>
            <dl className="mt-4 grid gap-2 text-sm">
              {[
                ["Çevrilecek bölüm", batchQuote.eligibleCount],
                ["Çıkarılan bölüm", batchQuote.excludedCount],
                [
                  "Toplam kredi",
                  `${formatCredits.format(batchQuote.totalCredits)} kredi`,
                ],
                ["Bakiye", `${formatCredits.format(batchQuote.balance)} kredi`],
                [
                  "Eksik kredi",
                  `${formatCredits.format(batchQuote.missingCredits)} kredi`,
                ],
              ].map(([label, value]) => (
                <div className="flex justify-between gap-4" key={label}>
                  <dt className="text-nv-muted-foreground">{label}</dt>
                  <dd
                    className={
                      label === "Eksik kredi" && batchQuote.missingCredits > 0
                        ? "font-bold text-danger"
                        : "font-semibold"
                    }
                  >
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            {batchQuote.excludedCount ? (
              <div className="mt-4 rounded-lg border border-nv-warning/50 bg-nv-warning/10 p-3 text-sm">
                <strong>İşlemden çıkarılanlar</strong>
                <ul className="mt-2 grid gap-1 text-nv-muted-foreground">
                  {batchQuote.items
                    .filter((item) => !item.eligible)
                    .map((item) => (
                      <li key={item.sourceChapterId}>
                        Bölüm {item.chapterNumber}: {item.exclusionReason}
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <button
                className="rounded-lg border border-nv-border px-4 py-3 font-semibold"
                disabled={batchSubmitting}
                onClick={() => setBatchConfirmationOpen(false)}
                type="button"
              >
                Vazgeç
              </button>
              <button
                className="rounded-lg bg-nv-primary px-4 py-3 font-semibold text-nv-primary-foreground disabled:opacity-50"
                disabled={
                  batchSubmitting ||
                  batchQuote.missingCredits > 0 ||
                  batchQuote.eligibleCount === 0
                }
                onClick={() => void submitBatchTranslation()}
                type="button"
              >
                {batchSubmitting
                  ? "Başlatılıyor…"
                  : batchQuote.missingCredits > 0
                    ? "Bakiye yetersiz"
                    : "Onayla ve çevir"}
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
      {batchResult ? (
        <div
          aria-labelledby="batch-translation-result-title"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-nv-background/80 p-4 backdrop-blur-sm"
          role="dialog"
        >
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="my-auto w-full max-w-lg rounded-xl border border-nv-border bg-surface p-5 shadow-2xl sm:p-6"
            initial={{ opacity: 0, scale: 0.97, y: 16 }}
          >
            <h2
              className="font-bold text-xl"
              id="batch-translation-result-title"
            >
              Çoklu çeviri durumu
            </h2>
            <p className="mt-2 text-nv-muted-foreground text-sm">
              Genel durum: {batchResult.status} · {batchResult.eligibleCount}{" "}
              bölüm · {formatCredits.format(batchResult.totalCredits)} kredi
            </p>
            <div className="mt-4 grid gap-2">
              {batchResult.items.map((item) => (
                <div
                  className="flex items-start justify-between gap-4 rounded-lg border border-nv-border p-3 text-sm"
                  key={item.id}
                >
                  <span>Bölüm {item.chapterNumber}</span>
                  <span className="text-right font-semibold">
                    {item.status}
                    {item.failureReason || item.exclusionReason ? (
                      <small className="mt-1 block max-w-64 font-normal text-nv-muted-foreground">
                        {item.failureReason ?? item.exclusionReason}
                      </small>
                    ) : null}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <button
                className="rounded-lg border border-nv-border px-4 py-3 font-semibold"
                onClick={() => setBatchResult(null)}
                type="button"
              >
                Kapat
              </button>
              <Link
                className="rounded-lg bg-nv-primary px-4 py-3 text-center font-semibold text-nv-primary-foreground"
                href="/translate/serilerim"
              >
                Taleplerime git
              </Link>
            </div>
          </motion.div>
        </div>
      ) : null}
      {pendingSubmission ? (
        <div
          aria-labelledby="translation-confirmation-title"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-nv-background/80 p-4 backdrop-blur-sm"
          role="dialog"
        >
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="my-auto w-full max-w-lg rounded-xl border border-nv-border bg-surface p-5 shadow-2xl sm:p-6"
            initial={{ opacity: 0, scale: 0.97, y: 16 }}
          >
            <h2
              className="font-bold text-xl"
              id="translation-confirmation-title"
            >
              Çeviri talebini onayla
            </h2>
            {pendingSubmission.request ? (
              <div className="mt-4 rounded-lg border border-nv-primary bg-nv-primary-soft p-3 text-sm">
                <strong>
                  {pendingSubmission.mode === "complete"
                    ? "Bu bölüm aktif bir toplu talebe dahil."
                    : "Seçtiğin toplu talebe kredi ekleyeceksin."}
                </strong>
                <p className="mt-1">
                  Şimdiye kadar{" "}
                  {formatCredits.format(
                    pendingSubmission.request.fundedCredits,
                  )}{" "}
                  kredi toplandı.
                  {pendingSubmission.mode === "complete"
                    ? " Anında çeviri başarılı olursa bu bölüm paketten düşülecek ve oluşan fazla kredi katkı oranlarına göre iade edilecek."
                    : ""}
                </p>
              </div>
            ) : null}
            <dl className="mt-4 grid gap-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-nv-muted-foreground">Hesabından çıkacak</dt>
                <dd className="font-bold">
                  {formatCredits.format(pendingCost)} kredi
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-nv-muted-foreground">Mevcut bakiye</dt>
                <dd>
                  {authenticated
                    ? `${formatCredits.format(balance)} kredi`
                    : "Giriş gerekli"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-nv-muted-foreground">
                  İşlem sonrası bakiye
                </dt>
                <dd
                  className={
                    authenticated && balance < pendingCost
                      ? "text-danger"
                      : "text-foreground"
                  }
                >
                  {!authenticated
                    ? "Girişten sonra hesaplanacak"
                    : balance < pendingCost
                      ? `${formatCredits.format(pendingCost - balance)} kredi eksik`
                      : `${formatCredits.format(balance - pendingCost)} kredi`}
                </dd>
              </div>
            </dl>
            {pendingSubmission.request ? (
              <div className="mt-4 rounded-lg border border-nv-border bg-background p-3 text-sm">
                <strong>
                  {pendingSubmission.mode === "complete"
                    ? "Etkilenecek toplu talep"
                    : "Desteklenecek toplu talep"}
                </strong>
                <p className="mt-2 text-nv-muted-foreground">
                  Bölüm{" "}
                  {compactChapterNumbers(
                    pendingSubmission.request.chapterNumbers,
                  )}{" "}
                  · {pendingSubmission.request.sourceLabel} ·{" "}
                  {pendingSubmission.request.qualityTier === "premium"
                    ? "Premium"
                    : "Dengeli"}{" "}
                  · Türkçe
                </p>
              </div>
            ) : null}
            {existingTranslations.length ? (
              <div className="mt-4 rounded-lg border border-nv-warning/50 bg-nv-warning/10 p-3 text-sm">
                Seçilen bölümlerden {existingTranslations.length} tanesi için
                sitede zaten bir sürüm var. Mevcut bölüm yeniden eklenmeyecek.
              </div>
            ) : null}
            {!pendingSubmission.request &&
            differentSettingsRequests.length &&
            !sameSettingsRequests.length &&
            pendingSubmission.mode === "complete" ? (
              <div
                className="mt-4 rounded-lg border border-nv-warning bg-nv-warning/10 p-3 text-sm"
                role="alert"
              >
                <strong>Seçtiğin farklı ayarlarla yeni talep açılacak.</strong>
                <ul className="mt-2 grid gap-1">
                  {differentSettingsRequests.map((request) => (
                    <li key={request.campaignId}>
                      Mevcut: Bölüm{" "}
                      {compactChapterNumbers(request.chapterNumbers)} ·{" "}
                      {request.qualityTier === "premium"
                        ? "Premium"
                        : "Dengeli"}{" "}
                      · {request.sourceLabel}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <button
                className="rounded-lg border border-nv-border px-4 py-3 font-semibold"
                onClick={() => setPendingSubmission(null)}
                type="button"
              >
                Vazgeç
              </button>
              <button
                className="rounded-lg bg-nv-primary px-4 py-3 font-semibold text-nv-primary-foreground disabled:opacity-50"
                disabled={authenticated && balance < pendingCost}
                onClick={() => {
                  const submission = pendingSubmission
                  setPendingSubmission(null)
                  void submitCampaign(
                    submission.mode,
                    submission.credits,
                    true,
                    submission.request,
                  )
                }}
                type="button"
              >
                {!authenticated
                  ? "Giriş yap ve devam et"
                  : balance < pendingCost
                    ? "Bakiye yetersiz"
                    : pendingSubmission.mode === "community"
                      ? "Onayla ve destekle"
                      : "Onayla ve çevir"}
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
      {authPromptOpen ? (
        <div
          aria-labelledby="translation-auth-title"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-nv-background/80 p-4 backdrop-blur-sm"
          role="dialog"
        >
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="my-auto w-full max-w-md rounded-xl border border-nv-border bg-surface p-5 shadow-2xl sm:p-6"
            initial={{ opacity: 0, scale: 0.97, y: 16 }}
          >
            <h2 className="font-bold text-xl" id="translation-auth-title">
              Önce giriş yapmalısın
            </h2>
            <p className="mt-2 text-nv-muted-foreground text-sm">
              Çeviri talebi oluşturmak veya kredi eklemek için hesabına giriş
              yap. Seçtiğin seri ve ayarlar dönüşünde korunacak.
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <button
                className="rounded-lg border border-nv-border px-4 py-3 font-semibold"
                onClick={() => setAuthPromptOpen(false)}
                type="button"
              >
                İptal
              </button>
              <button
                className="rounded-lg bg-nv-primary px-4 py-3 text-center font-semibold text-nv-primary-foreground"
                onClick={() =>
                  router.push(
                    `/auth/sign-in?callbackURL=${encodeURIComponent(
                      `${window.location.pathname}${window.location.search}`,
                    )}`,
                  )
                }
                type="button"
              >
                Giriş yap
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </div>
  )
}
