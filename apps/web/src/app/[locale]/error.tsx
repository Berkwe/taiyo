"use client"

import { ErrorState } from "~/components/platform/content"

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="py-16 content-shell" id="main-content">
      <ErrorState message={error.message || "Beklenmeyen bir hata oluştu."} />
      <button
        className="mt-4 min-h-11 bg-nv-primary px-5 font-semibold text-nv-primary-foreground"
        onClick={reset}
        type="button"
      >
        Tekrar dene
      </button>
    </main>
  )
}
