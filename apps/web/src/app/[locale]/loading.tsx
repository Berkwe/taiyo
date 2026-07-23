import { LoadingSkeleton } from "~/components/platform/content"

export default function Loading() {
  return (
    <main className="py-16 content-shell" id="main-content">
      <div className="mb-8 h-10 w-64 animate-pulse bg-surface-raised" />
      <LoadingSkeleton />
    </main>
  )
}
