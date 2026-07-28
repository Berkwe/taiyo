"use client"

import { Languages, X } from "lucide-react"
import { motion } from "motion/react"
import Link from "next/link"
import type { PopupMotionState } from "~/hooks/use-animated-presence"

export function ReaderTranslationPrompt({
  controlsVisible,
  href,
  motionState,
  onClose,
  seriesTitle,
}: {
  controlsVisible: boolean
  href: string
  motionState: PopupMotionState
  onClose: () => void
  seriesTitle: string
}) {
  return (
    <motion.aside
      animate={
        motionState === "closing" ? { opacity: 0, y: 36 } : { opacity: 1, y: 0 }
      }
      aria-label="Sonraki bölümü çevirme önerisi"
      className={`fixed right-3 left-3 z-[80] mx-auto max-w-xl rounded-3xl border border-nv-border bg-surface/95 p-4 text-foreground shadow-2xl backdrop-blur-md transition-[top] sm:top-20 sm:right-5 sm:left-auto sm:w-[28rem] ${
        controlsVisible ? "top-20" : "top-3"
      }`}
      data-popup-motion={motionState}
      initial={{ opacity: 0, y: -28 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-nv-primary-soft text-nv-primary">
          <Languages aria-hidden="true" size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold">
            Hay aksi, son bölüme geldik. Sonraki bölümü AI ile çevirip birkaç
            dakika içinde okumak ister misiniz?
          </h2>
          <p className="mt-1 text-nv-muted-foreground text-sm">
            {seriesTitle} için talep oluşturabilir veya okumaya ara
            verebilirsin.
          </p>
          <Link
            className="mt-3 inline-flex min-h-10 items-center rounded-full bg-nv-primary px-5 font-semibold text-nv-primary-foreground"
            href={href}
          >
            Diğer bölümü AI ile çevir
          </Link>
        </div>
        <button
          aria-label="Öneriyi kapat"
          className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-surface-raised"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" size={19} />
        </button>
      </div>
    </motion.aside>
  )
}
