export interface MergeableProgress {
  pageNumber: number
  scrollRatio: number
  updatedAt: Date
  completedAt: Date | null
}

export function shouldReplaceProgress(
  current: MergeableProgress | null,
  incoming: MergeableProgress,
) {
  if (!current) return true
  if (incoming.completedAt && !current.completedAt) return true
  if (!incoming.completedAt && current.completedAt) return false
  if (incoming.scrollRatio > current.scrollRatio) return true
  if (incoming.scrollRatio < current.scrollRatio) return false
  if (incoming.pageNumber > current.pageNumber) return true
  return incoming.updatedAt > current.updatedAt
}
