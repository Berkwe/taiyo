export interface ContributorBalance {
  userId: string
  credits: number
}

export interface ContributorRefund {
  userId: string
  credits: number
}

export function proportionalContributorRefunds(
  contributors: ContributorBalance[],
  requestedCredits: number,
): ContributorRefund[] {
  const balances = contributors
    .filter((contributor) => contributor.credits > 0)
    .sort((left, right) => left.userId.localeCompare(right.userId))
  const total = balances.reduce(
    (sum, contributor) => sum + contributor.credits,
    0,
  )
  const refundable = Math.min(Math.max(0, requestedCredits), total)
  if (!refundable || !total) return []

  const allocations = balances.map((contributor) => {
    const weighted = refundable * contributor.credits
    return {
      ...contributor,
      refund: Math.floor(weighted / total),
      remainder: weighted % total,
    }
  })
  let remainder =
    refundable -
    allocations.reduce((sum, contributor) => sum + contributor.refund, 0)
  allocations.sort(
    (left, right) =>
      right.remainder - left.remainder ||
      left.userId.localeCompare(right.userId),
  )
  for (const contributor of allocations) {
    if (!remainder) break
    contributor.refund += 1
    remainder -= 1
  }
  return allocations
    .filter((contributor) => contributor.refund > 0)
    .sort((left, right) => left.userId.localeCompare(right.userId))
    .map((contributor) => ({
      userId: contributor.userId,
      credits: contributor.refund,
    }))
}

export function adjustPackageForExternalCompletion(input: {
  targetCredits: number
  fundedCredits: number
  allocatedCredits: number
}) {
  const targetCredits = Math.max(
    0,
    input.targetCredits - input.allocatedCredits,
  )
  const refundCredits = Math.max(0, input.fundedCredits - targetCredits)
  const fundedCredits = input.fundedCredits - refundCredits
  return {
    targetCredits,
    fundedCredits,
    refundCredits,
    funded: fundedCredits >= targetCredits,
  }
}

export function restorePackageAfterInstantFailure(input: {
  adjustedTargetCredits: number
  fundedCredits: number
  allocatedCredits: number
}) {
  const targetCredits =
    input.adjustedTargetCredits + Math.max(0, input.allocatedCredits)
  return {
    targetCredits,
    fundedCredits: input.fundedCredits,
    funded: input.fundedCredits >= targetCredits,
  }
}

export function compactChapterNumbers(chapterNumbers: string[], edgeCount = 2) {
  if (chapterNumbers.length <= edgeCount * 2 + 1)
    return chapterNumbers.join(", ")
  return [
    ...chapterNumbers.slice(0, edgeCount),
    "…",
    ...chapterNumbers.slice(-edgeCount),
  ].join(", ")
}
