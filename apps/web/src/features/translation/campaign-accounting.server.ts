import type { Prisma } from "@taiyomoe/db"
import { proportionalContributorRefunds } from "./campaign-accounting"

export async function refundCampaignExcess(
  tx: Prisma.TransactionClient,
  campaignId: string,
  credits: number,
  idempotencyKey: string,
) {
  if (credits <= 0) return
  const contributions = await tx.translationContribution.findMany({
    where: { campaignId, status: "COMMITTED" },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      userId: true,
      credits: true,
      refundedCredits: true,
    },
  })
  const byUser = new Map<string, number>()
  for (const contribution of contributions) {
    const available = contribution.credits - contribution.refundedCredits
    byUser.set(
      contribution.userId,
      (byUser.get(contribution.userId) ?? 0) + available,
    )
  }
  const refunds = proportionalContributorRefunds(
    [...byUser].map(([userId, available]) => ({
      userId,
      credits: available,
    })),
    credits,
  )
  for (const refund of refunds) {
    let remaining = refund.credits
    for (const contribution of contributions.filter(
      (item) => item.userId === refund.userId,
    )) {
      if (!remaining) break
      const available = contribution.credits - contribution.refundedCredits
      const amount = Math.min(remaining, available)
      if (!amount) continue
      const refundedCredits = contribution.refundedCredits + amount
      await tx.translationContribution.update({
        where: { id: contribution.id },
        data: {
          refundedCredits,
          ...(refundedCredits === contribution.credits
            ? { status: "REFUNDED", refundedAt: new Date() }
            : {}),
        },
      })
      remaining -= amount
    }
    await tx.creditAccount.upsert({
      where: { userId: refund.userId },
      create: { userId: refund.userId, cachedBalance: refund.credits },
      update: { cachedBalance: { increment: refund.credits } },
    })
    await tx.creditTransaction.create({
      data: {
        userId: refund.userId,
        amount: refund.credits,
        type: "CONTRIBUTION_REFUND",
        referenceType: "translation_campaign",
        referenceId: campaignId,
        idempotencyKey: `${idempotencyKey}:refund:${refund.userId}`,
        metadata: { reason: "chapter_completed_by_instant_translation" },
      },
    })
  }
}
