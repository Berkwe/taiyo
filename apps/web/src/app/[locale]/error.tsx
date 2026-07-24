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
      <ErrorState message="Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin." />
      {error.digest ? (
        <p className="mt-2 text-nv-muted-foreground text-xs">
          Hata kodu: {error.digest}
        </p>
      ) : null}
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
