"use server"

import { randomUUID } from "node:crypto"
import { cacheClient } from "@taiyomoe/cache"
import { db } from "@taiyomoe/db"
import { meilisearchClient } from "@taiyomoe/meilisearch"
import { checksum, getStorage } from "@taiyomoe/storage"
import { parseCbz, parseImage } from "@taiyomoe/storage/cbz"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { enforceQualityActivation } from "~/features/management/release-quality"
import { validateRelease } from "~/features/management/release-validation"
import { requireManagementUser } from "~/features/management/server"
import {
  accountDeletionSchema,
  accountStateSchema,
  cbzUploadInputSchema,
  chapterInputSchema,
  chapterSourceInputSchema,
  formObject,
  roleInputSchema,
  seriesInputSchema,
} from "~/features/management/validation"
import { processMandownTranslationJob } from "~/features/translation/mandown-import"

const adminPath = "/admin"

export async function updateCatalogSourceVisibility(formData: FormData) {
  const actor = await requireManagementUser("content:publish")
  const sourceEditionId = z
    .string()
    .uuid()
    .parse(formData.get("sourceEditionId"))
  const editionIsPublic = formData.get("editionIsPublic") === "on"
  const visibleChapterIds = z
    .array(z.string().uuid())
    .max(5_000)
    .parse(
      formData
        .getAll("visibleChapterIds")
        .filter((value): value is string => typeof value === "string"),
    )
  const uniqueVisibleChapterIds = [...new Set(visibleChapterIds)]
  const edition = await db.catalogSourceEdition.findUniqueOrThrow({
    where: { id: sourceEditionId },
    select: {
      id: true,
      isPublic: true,
      chapters: {
        where: { isAvailable: true },
        select: { id: true, isPublic: true },
      },
    },
  })
  const availableChapterIds = new Set(
    edition.chapters.map((chapter) => chapter.id),
  )
  if (
    uniqueVisibleChapterIds.some(
      (chapterId) => !availableChapterIds.has(chapterId),
    )
  ) {
    throw new Error("Seçilen bölümlerden biri bu katalog kaynağına ait değil.")
  }

  await db.$transaction(async (tx) => {
    await tx.catalogSourceEdition.update({
      where: { id: edition.id },
      data: { isPublic: editionIsPublic },
    })
    await tx.catalogSourceChapter.updateMany({
      where: { sourceEditionId: edition.id },
      data: { isPublic: false },
    })
    if (uniqueVisibleChapterIds.length) {
      await tx.catalogSourceChapter.updateMany({
        where: {
          sourceEditionId: edition.id,
          id: { in: uniqueVisibleChapterIds },
          isAvailable: true,
        },
        data: { isPublic: true },
      })
    }
    await tx.contentRevision.create({
      data: {
        entityType: "CATALOG_SOURCE",
        entityId: edition.id,
        action: "UPDATE",
        actorId: actor.id,
        before: {
          isPublic: edition.isPublic,
          visibleChapterIds: edition.chapters
            .filter((chapter) => chapter.isPublic)
            .map((chapter) => chapter.id),
        },
        after: {
          isPublic: editionIsPublic,
          visibleChapterIds: uniqueVisibleChapterIds,
        },
      },
    })
  })
  revalidatePath(adminPath)
  revalidatePath("/translate")
  revalidatePath("/tr/translate")
  revalidatePath("/en/translate")
}

export async function updateMockTranslationJob(formData: FormData) {
  const actor = await requireManagementUser("users:manage")
  const jobId = z.string().uuid().parse(formData.get("jobId"))
  const status = z
    .enum(["PROCESSING", "COMPLETED", "FAILED"])
    .parse(formData.get("status"))
  const job = await db.translationJob.findUniqueOrThrow({
    where: { id: jobId },
    include: {
      campaign: {
        include: {
          contributions: {
            where: { status: "COMMITTED" },
            select: { userId: true },
          },
        },
      },
    },
  })
  if (job.provider !== "mandown")
    throw new Error("Yalnız Mandown job durumu bu ekrandan değiştirilebilir.")
  if (job.campaign.status === "REFUNDED") {
    throw new Error("İade edilmiş Mandown talebi yeniden çalıştırılamaz.")
  }
  if (status !== "FAILED") {
    await processMandownTranslationJob(job.id, { retryProcessing: true })
    revalidatePath(adminPath)
    revalidatePath("/tr/translate")
    return
  }
  const campaignStatus = "FAILED"
  await db.$transaction(async (tx) => {
    await tx.translationJob.update({
      where: { id: job.id },
      data: {
        status,
        completedAt: null,
        failureReason: "Admin tarafından başarısız işaretlendi",
        payload: job.payload,
      },
    })
    await tx.translationCampaign.update({
      where: { id: job.campaignId },
      data: {
        status: campaignStatus,
        completedAt: null,
        publicAt: null,
      },
    })
    for (const userId of new Set(
      job.campaign.contributions.map((item) => item.userId),
    )) {
      await tx.siteNotification.upsert({
        where: {
          dedupeKey: `translation-job:${job.id}:${status}:${userId}`,
        },
        create: {
          userId,
          type: "TRANSLATION_CAMPAIGN",
          title: "Çeviri işlemi başarısız",
          message: "Desteklediğiniz çeviri talebinin durumu güncellendi.",
          href: "/tr/translate",
          dedupeKey: `translation-job:${job.id}:${status}:${userId}`,
        },
        update: {},
      })
    }
    await tx.contentRevision.create({
      data: {
        entityType: "TRANSLATION_CAMPAIGN",
        entityId: job.campaignId,
        action: "UPDATE",
        actorId: actor.id,
        before: { jobStatus: job.status, campaignStatus: job.campaign.status },
        after: { jobStatus: status, campaignStatus },
      },
    })
  })
  revalidatePath(adminPath)
  revalidatePath("/tr/translate")
}

export async function refundTranslationCampaign(formData: FormData) {
  const actor = await requireManagementUser("users:manage")
  const campaignId = z.string().uuid().parse(formData.get("campaignId"))
  const confirmation = z.string().parse(formData.get("confirmation"))
  if (confirmation !== "IADE") throw new Error("İade onayı eşleşmiyor.")
  const campaign = await db.translationCampaign.findUniqueOrThrow({
    where: { id: campaignId },
    include: { contributions: { where: { status: "COMMITTED" } } },
  })
  await db.$transaction(async (tx) => {
    for (const contribution of campaign.contributions) {
      await tx.creditAccount.upsert({
        where: { userId: contribution.userId },
        create: {
          userId: contribution.userId,
          cachedBalance: contribution.credits,
        },
        update: { cachedBalance: { increment: contribution.credits } },
      })
      await tx.creditTransaction.upsert({
        where: {
          idempotencyKey: `translation-refund:${contribution.id}`,
        },
        create: {
          userId: contribution.userId,
          amount: contribution.credits,
          type: "CONTRIBUTION_REFUND",
          referenceType: "translation_contribution",
          referenceId: contribution.id,
          idempotencyKey: `translation-refund:${contribution.id}`,
        },
        update: {},
      })
      await tx.translationContribution.update({
        where: { id: contribution.id },
        data: { status: "REFUNDED", refundedAt: new Date() },
      })
      await tx.siteNotification.upsert({
        where: {
          dedupeKey: `translation-refund:${contribution.id}:notification`,
        },
        create: {
          userId: contribution.userId,
          type: "TRANSLATION_CAMPAIGN",
          title: "Çeviri katkısı iade edildi",
          message: `${contribution.credits} kredi hesabınıza geri yüklendi.`,
          href: "/tr/translate",
          dedupeKey: `translation-refund:${contribution.id}:notification`,
        },
        update: {},
      })
    }
    await tx.translationCampaign.update({
      where: { id: campaign.id },
      data: {
        status: "REFUNDED",
        chapters: { updateMany: { where: {}, data: { activeKey: null } } },
      },
    })
    await tx.contentRevision.create({
      data: {
        entityType: "TRANSLATION_CAMPAIGN",
        entityId: campaign.id,
        action: "UPDATE",
        actorId: actor.id,
        before: { status: campaign.status },
        after: { status: "REFUNDED" },
      },
    })
  })
  revalidatePath(adminPath)
}

function fileFrom(formData: FormData, name: string) {
  const value = formData.get(name)
  return value instanceof File && value.size > 0 ? value : null
}

async function storeCover(file: File, seriesId: string) {
  const image = parseImage(new Uint8Array(await file.arrayBuffer()))
  const key = `covers/series/${seriesId}/${randomUUID()}.${image.extension}`
  await getStorage().put(key, image.body, { contentType: image.mimeType })
  return key
}

async function revokeSessions(userId: string) {
  const sessions = await db.session.findMany({
    where: { userId },
    select: { token: true },
  })
  await db.session.deleteMany({ where: { userId } })
  await Promise.allSettled(
    sessions.map(({ token }) => cacheClient.users.auth.invalidate(token)),
  )
}

function avatarStorageKey(image: string | null) {
  const prefix = "/api/storage/"
  return image?.startsWith(`${prefix}avatars/`)
    ? image.slice(prefix.length)
    : null
}

export async function updateUserRole(formData: FormData) {
  const actor = await requireManagementUser("users:manage")
  const input = roleInputSchema.parse(formObject(formData))
  if (actor.id === input.userId) {
    throw new Error("Kendi rolünüzü değiştiremezsiniz.")
  }
  const existing = await db.user.findUniqueOrThrow({
    where: { id: input.userId },
    select: { role: true },
  })
  const notificationKey = `user-role:${input.userId}:${input.role}:${Date.now()}`
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: input.userId },
      data: { role: input.role },
    })
    await tx.contentRevision.create({
      data: {
        entityType: "USER",
        entityId: input.userId,
        action: "UPDATE",
        actorId: actor.id,
        before: { role: existing.role },
        after: { role: input.role },
      },
    })
    const preference = await tx.notificationPreference.findUnique({
      where: { userId: input.userId },
    })
    if (preference?.accountUpdates !== false) {
      await tx.siteNotification.upsert({
        where: {
          dedupeKey: notificationKey,
        },
        create: {
          userId: input.userId,
          type: "ACCOUNT_UPDATE",
          title: "Hesap rolünüz güncellendi",
          message: `Yeni rolünüz: ${input.role}`,
          href: "/tr/profil",
          dedupeKey: notificationKey,
        },
        update: {},
      })
    }
  })
  await revokeSessions(input.userId)
  revalidatePath(adminPath)
}

export async function addUserCredits(formData: FormData) {
  const actor = await requireManagementUser("users:manage")
  if (actor.role !== "ADMIN") {
    throw new Error("Kullanıcı kredisi yalnız admin tarafından eklenebilir.")
  }
  const input = z
    .object({
      userId: z.string().uuid(),
      credits: z.coerce.number().int().positive().max(1_000_000),
    })
    .parse(Object.fromEntries(formData))
  const user = await db.user.findFirstOrThrow({
    where: { id: input.userId, deletedAt: null },
    select: { id: true },
  })
  const idempotencyKey = `admin-credit:${actor.id}:${user.id}:${randomUUID()}`

  await db.$transaction(async (tx) => {
    await tx.creditAccount.upsert({
      where: { userId: user.id },
      create: { userId: user.id, cachedBalance: input.credits },
      update: { cachedBalance: { increment: input.credits } },
    })
    await tx.creditTransaction.create({
      data: {
        userId: user.id,
        amount: input.credits,
        type: "ADMIN_ADJUSTMENT",
        referenceType: "admin_credit",
        referenceId: actor.id,
        idempotencyKey,
        metadata: { actorId: actor.id },
      },
    })
    await tx.contentRevision.create({
      data: {
        entityType: "USER",
        entityId: user.id,
        action: "UPDATE",
        actorId: actor.id,
        after: { creditAdjustment: input.credits },
      },
    })
    await tx.siteNotification.upsert({
      where: { dedupeKey: `${idempotencyKey}:notification` },
      create: {
        userId: user.id,
        type: "ACCOUNT_UPDATE",
        title: "Kredi bakiyeniz güncellendi",
        message: `Hesabınıza ${input.credits} kredi eklendi.`,
        href: "/tr/translate",
        dedupeKey: `${idempotencyKey}:notification`,
      },
      update: {},
    })
  })
  revalidatePath(adminPath)
  revalidatePath("/tr/translate")
}

export async function updateAccountState(formData: FormData) {
  const actor = await requireManagementUser("users:manage")
  const input = accountStateSchema.parse(formObject(formData))
  if (actor.id === input.userId) {
    throw new Error("Kendi hesabınızı devre dışı bırakamazsınız.")
  }
  await db.user.update({
    where: { id: input.userId },
    data: {
      banned: input.disabled,
      banReason: input.disabled
        ? "Yönetici tarafından devre dışı bırakıldı"
        : null,
      banExpires: null,
    },
  })
  await revokeSessions(input.userId)
  revalidatePath(adminPath)
}

export async function deleteUserAccount(formData: FormData) {
  const actor = await requireManagementUser("users:manage")
  const input = accountDeletionSchema.parse(formObject(formData))
  if (actor.id === input.userId) {
    throw new Error("Kendi hesabınızı silemezsiniz.")
  }

  const existing = await db.user.findFirstOrThrow({
    where: { id: input.userId, deletedAt: null },
    select: {
      email: true,
      id: true,
      image: true,
      role: true,
      username: true,
      sessions: { select: { token: true } },
      contentReports: { select: { attachmentStorageKey: true } },
    },
  })
  if (input.confirmation !== existing.username) {
    throw new Error("Hesap silme onayı kullanıcı adıyla eşleşmiyor.")
  }
  if (
    existing.role === "ADMIN" &&
    (await db.user.count({
      where: { role: "ADMIN", deletedAt: null, banned: { not: true } },
    })) <= 1
  ) {
    throw new Error("Sistemdeki son etkin yönetici hesabı silinemez.")
  }

  const deletedAt = new Date()
  const deletedUsername = `deleted_${existing.id.slice(0, 8)}_${deletedAt
    .getTime()
    .toString(36)}`

  await db.$transaction(async (tx) => {
    await tx.contentReport.updateMany({
      where: { assignedToId: existing.id },
      data: { assignedToId: null },
    })
    await tx.siteNotification.deleteMany({ where: { userId: existing.id } })
    await tx.notificationPreference.deleteMany({
      where: { userId: existing.id },
    })
    await tx.seriesFollow.deleteMany({ where: { userId: existing.id } })
    await tx.readingProgressRecord.deleteMany({
      where: { userId: existing.id },
    })
    await tx.userHistory.deleteMany({ where: { userId: existing.id } })
    await tx.contentReport.deleteMany({ where: { userId: existing.id } })
    await tx.userProfile.deleteMany({ where: { userId: existing.id } })
    await tx.userLibrary.deleteMany({ where: { userId: existing.id } })
    await tx.account.deleteMany({ where: { userId: existing.id } })
    await tx.session.deleteMany({ where: { userId: existing.id } })
    if (existing.email) {
      await tx.verification.deleteMany({
        where: { identifier: { contains: existing.email } },
      })
    }
    await tx.user.update({
      where: { id: existing.id },
      data: {
        name: "Silinmiş kullanıcı",
        username: deletedUsername,
        displayUsername: deletedUsername,
        email: null,
        normalizedEmail: null,
        emailVerified: false,
        image: null,
        banned: true,
        banReason: "ACCOUNT_DELETED",
        banExpires: null,
        deletedAt,
        role: "USER",
        settings: {},
        followers: { set: [] },
        following: { set: [] },
      },
    })
    await tx.contentRevision.create({
      data: {
        entityType: "USER",
        entityId: existing.id,
        action: "DELETE",
        actorId: actor.id,
        before: { role: existing.role },
        after: { deletedAt: deletedAt.toISOString() },
      },
    })
  })

  const storedFiles = [
    avatarStorageKey(existing.image),
    ...existing.contentReports.map((report) => report.attachmentStorageKey),
  ].filter((key): key is string => Boolean(key))
  await Promise.allSettled([
    ...existing.sessions.map(({ token }) =>
      cacheClient.users.auth.invalidate(token),
    ),
    meilisearchClient.users.deleteDocument(existing.id),
    ...storedFiles.map((key) => getStorage().delete(key)),
  ])
  revalidatePath(adminPath)
}

export async function createSeries(formData: FormData) {
  const actor = await requireManagementUser("series:write")
  const input = seriesInputSchema.parse(formObject(formData))
  const id = randomUUID()
  const cover = fileFrom(formData, "cover")
  const coverStorageKey = cover ? await storeCover(cover, id) : null
  try {
    await db.$transaction(async (tx) => {
      await tx.series.create({
        data: {
          id,
          slug: input.slug,
          originalLanguage: input.originalLanguage,
          type: input.type,
          status: input.status,
          publicationYear: input.publicationYear,
          coverStorageKey,
          isSearchable: false,
          isIndexable: false,
          localizations: {
            create: {
              locale: "tr",
              title: input.title,
              description: input.description,
            },
          },
        },
      })
      await tx.contentRevision.create({
        data: {
          entityType: "SERIES",
          entityId: id,
          action: "CREATE",
          actorId: actor.id,
          after: input,
        },
      })
    })
  } catch (error) {
    if (coverStorageKey) await getStorage().delete(coverStorageKey)
    throw error
  }
  revalidatePath(adminPath)
}

export async function updateSeries(formData: FormData) {
  const actor = await requireManagementUser("series:write")
  const input = seriesInputSchema
    .required({ id: true })
    .parse(formObject(formData))
  const existing = await db.series.findUniqueOrThrow({
    where: { id: input.id },
    include: { localizations: { where: { locale: "tr" }, take: 1 } },
  })
  const cover = fileFrom(formData, "cover")
  const newCoverKey = cover ? await storeCover(cover, input.id) : null
  try {
    await db.$transaction(async (tx) => {
      await tx.series.update({
        where: { id: input.id, deletedAt: null },
        data: {
          slug: input.slug,
          originalLanguage: input.originalLanguage,
          type: input.type,
          status: input.status,
          publicationYear: input.publicationYear,
          ...(newCoverKey ? { coverStorageKey: newCoverKey } : {}),
          localizations: {
            upsert: {
              where: { seriesId_locale: { seriesId: input.id, locale: "tr" } },
              create: {
                locale: "tr",
                title: input.title,
                description: input.description,
              },
              update: { title: input.title, description: input.description },
            },
          },
        },
      })
      await tx.contentRevision.create({
        data: {
          entityType: "SERIES",
          entityId: input.id,
          action: "UPDATE",
          actorId: actor.id,
          before: {
            slug: existing.slug,
            type: existing.type,
            status: existing.status,
            publicationYear: existing.publicationYear,
            localization: existing.localizations[0]
              ? {
                  title: existing.localizations[0].title,
                  description: existing.localizations[0].description,
                }
              : null,
          },
          after: input,
        },
      })
    })
  } catch (error) {
    if (newCoverKey) await getStorage().delete(newCoverKey)
    throw error
  }
  if (newCoverKey && existing.coverStorageKey) {
    await getStorage().delete(existing.coverStorageKey)
  }
  revalidatePath(adminPath)
}

export async function deleteSeries(formData: FormData) {
  await requireManagementUser("content:delete")
  const id = roleInputSchema.shape.userId.parse(formData.get("id"))
  const deletedAt = new Date()
  await db.$transaction([
    db.series.update({ where: { id }, data: { deletedAt } }),
    db.platformChapter.updateMany({
      where: { seriesId: id },
      data: { deletedAt },
    }),
    db.chapterRelease.updateMany({
      where: { chapter: { seriesId: id } },
      data: {
        deletedAt,
        status: "ARCHIVED",
        isPublic: false,
        isIndexable: false,
      },
    }),
  ])
  revalidatePath(adminPath)
}

export async function createChapter(formData: FormData) {
  const actor = await requireManagementUser("chapter:write")
  const input = chapterInputSchema.parse(formObject(formData))
  const id = randomUUID()
  await db.$transaction([
    db.platformChapter.create({
      data: {
        id,
        seriesId: input.seriesId,
        chapterNumber: input.chapterNumber,
        canonicalSlug: input.canonicalSlug,
        sortKey: input.sortKey,
        localizations: {
          create: { locale: "tr", title: input.title || null },
        },
      },
    }),
    db.contentRevision.create({
      data: {
        entityType: "CHAPTER",
        entityId: id,
        action: "CREATE",
        actorId: actor.id,
        after: input,
      },
    }),
  ])
  revalidatePath(adminPath)
}

export async function updateChapter(formData: FormData) {
  const actor = await requireManagementUser("chapter:write")
  const input = chapterInputSchema
    .required({ id: true })
    .parse(formObject(formData))
  const existing = await db.platformChapter.findUniqueOrThrow({
    where: { id: input.id, deletedAt: null },
    include: { localizations: { where: { locale: "tr" }, take: 1 } },
  })
  await db.$transaction([
    db.platformChapter.update({
      where: { id: input.id, deletedAt: null },
      data: {
        chapterNumber: input.chapterNumber,
        canonicalSlug: input.canonicalSlug,
        sortKey: input.sortKey,
        localizations: {
          upsert: {
            where: { chapterId_locale: { chapterId: input.id, locale: "tr" } },
            create: { locale: "tr", title: input.title || null },
            update: { title: input.title || null },
          },
        },
      },
    }),
    db.contentRevision.create({
      data: {
        entityType: "CHAPTER",
        entityId: input.id,
        action: "UPDATE",
        actorId: actor.id,
        before: {
          chapterNumber: existing.chapterNumber,
          canonicalSlug: existing.canonicalSlug,
          sortKey: existing.sortKey,
          localization: existing.localizations[0] ?? null,
        },
        after: input,
      },
    }),
  ])
  revalidatePath(adminPath)
}

export async function deleteChapter(formData: FormData) {
  await requireManagementUser("content:delete")
  const id = roleInputSchema.shape.userId.parse(formData.get("id"))
  const deletedAt = new Date()
  await db.$transaction([
    db.platformChapter.update({ where: { id }, data: { deletedAt } }),
    db.chapterRelease.updateMany({
      where: { chapterId: id },
      data: {
        deletedAt,
        status: "ARCHIVED",
        isPublic: false,
        isIndexable: false,
      },
    }),
  ])
  revalidatePath(adminPath)
}

export async function uploadCbz(formData: FormData) {
  const actor = await requireManagementUser("chapter:write")
  const input = cbzUploadInputSchema.parse(formObject(formData))
  await db.series.findUniqueOrThrow({
    where: { id: input.seriesId, deletedAt: null },
    select: { id: true },
  })
  if (input.existingChapterId) {
    await db.platformChapter.findFirstOrThrow({
      where: {
        id: input.existingChapterId,
        seriesId: input.seriesId,
        deletedAt: null,
      },
      select: { id: true },
    })
  }
  const file = fileFrom(formData, "cbz")
  if (!file || !file.name.toLocaleLowerCase("en").endsWith(".cbz")) {
    throw new Error("Geçerli bir .cbz dosyası seçin.")
  }
  const images = parseCbz(new Uint8Array(await file.arrayBuffer()))
  const chapterId = input.existingChapterId ?? randomUUID()
  const sourceId = input.existingSourceId ?? randomUUID()
  const releaseId = randomUUID()
  const storagePrefix = `chapters/${chapterId}/releases/${releaseId}`
  const stored: string[] = []

  try {
    const pages: Array<{
      pageNumber: number
      storageKey: string
      width: number
      height: number
      mimeType: string
      fileSize: bigint
      checksum: string
    }> = []
    for (const [index, image] of images.entries()) {
      const storageKey = `${storagePrefix}/${String(index + 1).padStart(4, "0")}.${image.extension}`
      await getStorage().put(storageKey, image.body, {
        contentType: image.mimeType,
      })
      stored.push(storageKey)
      pages.push({
        pageNumber: index + 1,
        storageKey,
        width: image.width,
        height: image.height,
        mimeType: image.mimeType,
        fileSize: BigInt(image.body.length),
        checksum: checksum(image.body),
      })
    }
    const thumbnailPage = input.thumbnailPage ?? 1
    const thumbnailStorageKey = thumbnailPage
      ? pages.find((page) => page.pageNumber === thumbnailPage)?.storageKey
      : undefined
    if (thumbnailPage && !thumbnailStorageKey) {
      throw new Error("Seçilen thumbnail sayfası CBZ içinde bulunamadı.")
    }

    await db.$transaction(async (tx) => {
      const profile = await tx.translationProfile.upsert({
        where: { slug: "novora-upload" },
        create: {
          slug: "novora-upload",
          labelKey: "Novora Upload",
          descriptionKey: "Yönetim panelinden yüklenen sürüm",
          sortOrder: 100,
          isHumanReviewed: false,
          isPublic: true,
          isIndexable: false,
        },
        update: {},
      })
      if (!input.existingChapterId) {
        await tx.platformChapter.create({
          data: {
            id: chapterId,
            seriesId: input.seriesId,
            chapterNumber: input.chapterNumber,
            canonicalSlug: input.canonicalSlug,
            sortKey: input.sortKey,
            thumbnailStorageKey,
            localizations: {
              create: { locale: "tr", title: input.title || null },
            },
          },
        })
      } else if (thumbnailStorageKey && input.replaceThumbnail) {
        await tx.platformChapter.update({
          where: { id: chapterId },
          data: { thumbnailStorageKey },
        })
      }
      const selectedSource = input.existingSourceId
        ? await tx.chapterSource.findFirstOrThrow({
            where: {
              id: input.existingSourceId,
              chapterId,
              isActive: true,
            },
            select: { id: true, language: true },
          })
        : await (async () => {
            if (input.isDefault) {
              await tx.chapterSource.updateMany({
                where: { chapterId },
                data: { isDefault: false },
              })
            }
            return tx.chapterSource.create({
              data: {
                id: sourceId,
                chapterId,
                platform: input.platform,
                language: input.sourceLanguage,
                displayLabel: input.displayLabel,
                description: input.sourceDescription,
                priority: input.sourcePriority,
                isDefault: input.isDefault,
                sourceUrl: input.sourceUrl || null,
                externalId: input.externalId || null,
              },
              select: { id: true, language: true },
            })
          })()
      const latestRevision = await tx.chapterRelease.aggregate({
        where: {
          chapterId,
          sourceId,
          targetLanguage: input.targetLanguage,
          translationProfileId: profile.id,
        },
        _max: { revision: true },
      })
      await tx.chapterRelease.create({
        data: {
          id: releaseId,
          chapterId,
          targetLanguage: input.targetLanguage,
          sourceLanguage: selectedSource.language,
          sourceId,
          qualityTier: input.qualityTier,
          pipelineVersion: input.pipelineVersion,
          translationProfileId: profile.id,
          revision: (latestRevision._max.revision ?? 0) + 1,
          storagePrefix,
          pageCount: pages.length,
          pages: { create: pages },
        },
      })
      await tx.contentRevision.createMany({
        data: [
          ...(!input.existingChapterId
            ? [
                {
                  entityType: "CHAPTER" as const,
                  entityId: chapterId,
                  action: "CREATE" as const,
                  actorId: actor.id,
                  after: {
                    source: "CBZ",
                    chapterNumber: input.chapterNumber,
                    pageCount: pages.length,
                  },
                },
              ]
            : []),
          {
            entityType: "RELEASE",
            entityId: releaseId,
            action: "CREATE",
            actorId: actor.id,
            after: { source: "CBZ", pageCount: pages.length },
          },
        ],
      })
    })
  } catch (error) {
    await Promise.allSettled(stored.map((key) => getStorage().delete(key)))
    throw error
  }
  revalidatePath(adminPath)
}

export async function updateChapterSource(formData: FormData) {
  const actor = await requireManagementUser("chapter:write")
  const input = chapterSourceInputSchema.parse(formObject(formData))
  const release = await db.chapterRelease.findUniqueOrThrow({
    where: { id: input.releaseId, deletedAt: null },
    select: {
      chapterId: true,
      isPublic: true,
      sourceId: true,
      status: true,
    },
  })
  if (release.sourceId !== input.sourceId) {
    throw new Error("Kaynak ve çeviri sürümü eşleşmiyor.")
  }
  await db.$transaction(async (tx) => {
    if (release.isPublic && release.status === "PUBLISHED") {
      if (input.qualityTier === "PREMIUM") {
        await tx.chapterRelease.updateMany({
          where: {
            id: { not: input.releaseId },
            sourceId: input.sourceId,
            targetLanguage: input.targetLanguage,
            isActive: true,
            deletedAt: null,
          },
          data: {
            isActive: false,
            isPublic: false,
            isIndexable: false,
            status: "ARCHIVED",
          },
        })
      } else {
        const activePremium = await tx.chapterRelease.findFirst({
          where: {
            id: { not: input.releaseId },
            sourceId: input.sourceId,
            targetLanguage: input.targetLanguage,
            qualityTier: "PREMIUM",
            isActive: true,
            isPublic: true,
            deletedAt: null,
          },
          select: { id: true },
        })
        if (activePremium) {
          throw new Error(
            "Etkin Premium sürüm varken Dengeli sürüm etkinleştirilemez.",
          )
        }
      }
    }
    if (input.isDefault) {
      await tx.chapterSource.updateMany({
        where: { chapterId: release.chapterId, id: { not: input.sourceId } },
        data: { isDefault: false },
      })
    }
    await tx.chapterSource.update({
      where: { id: input.sourceId },
      data: {
        platform: input.platform,
        language: input.sourceLanguage,
        displayLabel: input.displayLabel ?? null,
        description: input.sourceDescription,
        priority: input.sourcePriority,
        isDefault: input.isDefault,
        sourceUrl: input.sourceUrl || null,
        externalId: input.externalId || null,
      },
    })
    await tx.chapterRelease.update({
      where: { id: input.releaseId },
      data: {
        sourceLanguage: input.sourceLanguage,
        targetLanguage: input.targetLanguage,
        qualityTier: input.qualityTier,
        pipelineVersion: input.pipelineVersion,
      },
    })
    await tx.platformChapter.update({
      where: { id: release.chapterId },
      data: {
        thumbnailStorageKey: input.thumbnailStorageKey || null,
      },
    })
    await tx.contentRevision.create({
      data: {
        entityType: "RELEASE",
        entityId: input.releaseId,
        action: "UPDATE",
        actorId: actor.id,
        after: {
          sourceId: input.sourceId,
          targetLanguage: input.targetLanguage,
          qualityTier: input.qualityTier,
          pipelineVersion: input.pipelineVersion,
        },
      },
    })
  })
  revalidatePath(adminPath)
}

export async function publishRelease(formData: FormData) {
  const actor = await requireManagementUser("content:publish")
  const id = roleInputSchema.shape.userId.parse(formData.get("id"))
  const validation = await validateRelease(id)
  if (!validation.valid) {
    throw new Error(
      `Bölüm doğrulaması başarısız: ${validation.issues
        .map((issue) => issue.message)
        .join(" ")}`,
    )
  }
  const release = await db.chapterRelease.findUniqueOrThrow({
    where: { id, deletedAt: null },
    select: {
      qualityTier: true,
      sourceId: true,
      targetLanguage: true,
      chapter: {
        select: {
          chapterNumber: true,
          seriesId: true,
          series: {
            select: {
              slug: true,
              publishedAt: true,
              localizations: { where: { locale: "tr" }, take: 1 },
            },
          },
        },
      },
    },
  })
  const publishedAt = new Date()
  await db.$transaction(async (tx) => {
    await enforceQualityActivation(
      { id, ...release },
      {
        archiveOtherActive: async () => {
          await tx.chapterRelease.updateMany({
            where: {
              id: { not: id },
              sourceId: release.sourceId!,
              targetLanguage: release.targetLanguage,
              isActive: true,
              deletedAt: null,
            },
            data: {
              isActive: false,
              isPublic: false,
              isIndexable: false,
              status: "ARCHIVED",
            },
          })
        },
        hasOtherActivePremium: async () =>
          Boolean(
            await tx.chapterRelease.findFirst({
              where: {
                id: { not: id },
                sourceId: release.sourceId!,
                targetLanguage: release.targetLanguage,
                qualityTier: "PREMIUM",
                isActive: true,
                isPublic: true,
                deletedAt: null,
              },
              select: { id: true },
            }),
          ),
      },
    )
    await tx.chapterRelease.update({
      where: { id },
      data: {
        status: "PUBLISHED",
        publishedAt,
        isPublic: true,
        isActive: true,
        isIndexable: false,
      },
    })
    await tx.series.update({
      where: { id: release.chapter.seriesId },
      data: {
        publishedAt: release.chapter.series.publishedAt ?? publishedAt,
        isSearchable: true,
        isIndexable: true,
      },
    })
    await tx.contentRevision.create({
      data: {
        entityType: "RELEASE",
        entityId: id,
        action: "PUBLISH",
        actorId: actor.id,
        after: { publishedAt: publishedAt.toISOString(), status: "PUBLISHED" },
      },
    })
    const followers = await tx.seriesFollow.findMany({
      where: { seriesId: release.chapter.seriesId },
      select: {
        userId: true,
        user: {
          select: {
            notificationSettings: {
              select: { followedSeriesUpdates: true },
            },
          },
        },
      },
    })
    const recipients = followers.filter(
      (follow) =>
        follow.user.notificationSettings?.followedSeriesUpdates !== false,
    )
    if (recipients.length) {
      const seriesTitle =
        release.chapter.series.localizations[0]?.title ??
        release.chapter.series.slug
      await tx.siteNotification.createMany({
        data: recipients.map(({ userId }) => ({
          userId,
          seriesId: release.chapter.seriesId,
          releaseId: id,
          type: "FOLLOWED_SERIES_RELEASE" as const,
          title: `${seriesTitle} için yeni bölüm`,
          message: `Bölüm ${release.chapter.chapterNumber} yayınlandı.`,
          href: `/tr/seri/${release.chapter.series.slug}`,
          dedupeKey: `release:${id}:user:${userId}`,
        })),
        skipDuplicates: true,
      })
    }
  })
  revalidatePath(adminPath)
}

export async function updateReportStatus(formData: FormData) {
  const actor = await requireManagementUser("users:manage")
  const input = z
    .object({
      id: z.uuid(),
      status: z.enum(["OPEN", "REVIEWING", "RESOLVED", "REJECTED"]),
      adminNote: z.string().trim().max(2_000).optional(),
      assignedToId: z.uuid().optional(),
    })
    .parse(Object.fromEntries(formData))
  const report = await db.contentReport.findUniqueOrThrow({
    where: { id: input.id },
    select: { userId: true, status: true },
  })
  await db.$transaction(async (tx) => {
    await tx.contentReport.update({
      where: { id: input.id },
      data: {
        status: input.status,
        adminNote: input.adminNote || undefined,
        assignedToId: input.assignedToId || undefined,
        resolvedAt: ["RESOLVED", "REJECTED"].includes(input.status)
          ? new Date()
          : null,
      },
    })
    await tx.contentRevision.create({
      data: {
        entityType: "REPORT",
        entityId: input.id,
        action: "UPDATE",
        actorId: actor.id,
        before: { status: report.status },
        after: { status: input.status },
      },
    })
    if (["RESOLVED", "REJECTED"].includes(input.status)) {
      const preference = await tx.notificationPreference.findUnique({
        where: { userId: report.userId },
      })
      if (preference?.reportStatusUpdates !== false) {
        await tx.siteNotification.upsert({
          where: { dedupeKey: `report:${input.id}:${input.status}` },
          create: {
            userId: report.userId,
            reportId: input.id,
            type: "REPORT_STATUS",
            title: "İçerik raporunuz güncellendi",
            message:
              input.status === "RESOLVED"
                ? "Gönderdiğiniz rapor çözüldü."
                : "Gönderdiğiniz rapor reddedildi.",
            href: "/tr/profil",
            dedupeKey: `report:${input.id}:${input.status}`,
          },
          update: {},
        })
      }
    }
  })
  revalidatePath(adminPath)
}

export async function bulkReleaseAction(formData: FormData) {
  const actor = await requireManagementUser("content:publish")
  const input = z
    .object({
      ids: z
        .string()
        .transform((value) =>
          [...new Set(value.split(/[\s,]+/).filter(Boolean))].slice(0, 100),
        )
        .pipe(z.array(z.uuid()).min(1).max(100)),
      action: z.enum(["PUBLISH", "DRAFT", "ARCHIVE"]),
    })
    .parse(Object.fromEntries(formData))
  if (input.action === "PUBLISH") {
    const validations = await Promise.all(input.ids.map(validateRelease))
    const invalid = validations.filter((result) => !result.valid)
    if (invalid.length) {
      throw new Error(
        `${invalid.length} sürüm doğrulamadan geçemedi; hiçbir değişiklik yapılmadı.`,
      )
    }
  }
  await db.$transaction(async (tx) => {
    const existing = await tx.chapterRelease.findMany({
      where: { id: { in: input.ids }, deletedAt: null },
      select: {
        id: true,
        status: true,
        isPublic: true,
        qualityTier: true,
        sourceId: true,
        targetLanguage: true,
        chapter: {
          select: {
            chapterNumber: true,
            series: {
              select: {
                id: true,
                slug: true,
                localizations: { where: { locale: "tr" }, take: 1 },
                followers: {
                  select: {
                    userId: true,
                    user: {
                      select: {
                        notificationSettings: {
                          select: { followedSeriesUpdates: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })
    if (existing.length !== input.ids.length) {
      throw new Error("Sürümlerden biri bulunamadı; işlem geri alındı.")
    }
    const publishedAt = new Date()
    if (input.action === "PUBLISH") {
      const selectedKeys = new Set<string>()
      for (const release of existing) {
        if (!release.sourceId) continue
        const key = `${release.sourceId}:${release.targetLanguage}`
        if (selectedKeys.has(key)) {
          throw new Error(
            "Aynı kaynak ve çıktı dilinin birden fazla kalite sürümü tek seferde yayınlanamaz.",
          )
        }
        selectedKeys.add(key)
        await enforceQualityActivation(release, {
          archiveOtherActive: async () => {
            await tx.chapterRelease.updateMany({
              where: {
                id: { not: release.id },
                sourceId: release.sourceId!,
                targetLanguage: release.targetLanguage,
                isActive: true,
                deletedAt: null,
              },
              data: {
                isActive: false,
                isPublic: false,
                isIndexable: false,
                status: "ARCHIVED",
              },
            })
          },
          hasOtherActivePremium: async () =>
            Boolean(
              await tx.chapterRelease.findFirst({
                where: {
                  id: { not: release.id },
                  sourceId: release.sourceId!,
                  targetLanguage: release.targetLanguage,
                  qualityTier: "PREMIUM",
                  isActive: true,
                  isPublic: true,
                  deletedAt: null,
                },
                select: { id: true },
              }),
            ),
        })
      }
    }
    await tx.chapterRelease.updateMany({
      where: { id: { in: input.ids }, deletedAt: null },
      data:
        input.action === "PUBLISH"
          ? {
              status: "PUBLISHED",
              isPublic: true,
              isActive: true,
              publishedAt,
            }
          : input.action === "DRAFT"
            ? {
                status: "DRAFT",
                isPublic: false,
                isActive: false,
                isIndexable: false,
                publishedAt: null,
              }
            : {
                status: "ARCHIVED",
                isPublic: false,
                isActive: false,
                isIndexable: false,
                deletedAt: publishedAt,
              },
    })
    await tx.contentRevision.createMany({
      data: existing.map((release) => ({
        entityType: "RELEASE" as const,
        entityId: release.id,
        action: "BULK_UPDATE" as const,
        actorId: actor.id,
        before: { status: release.status, isPublic: release.isPublic },
        after: { action: input.action },
      })),
    })
    if (input.action === "PUBLISH") {
      await tx.siteNotification.createMany({
        data: existing.flatMap((release) => {
          const series = release.chapter.series
          const title = series.localizations[0]?.title ?? series.slug
          return series.followers
            .filter(
              (follow) =>
                follow.user.notificationSettings?.followedSeriesUpdates !==
                false,
            )
            .map(({ userId }) => ({
              userId,
              seriesId: series.id,
              releaseId: release.id,
              type: "FOLLOWED_SERIES_RELEASE" as const,
              title: `${title} için yeni bölüm`,
              message: `Bölüm ${release.chapter.chapterNumber} yayınlandı.`,
              href: `/tr/seri/${series.slug}`,
              dedupeKey: `release:${release.id}:user:${userId}`,
            }))
        }),
        skipDuplicates: true,
      })
    }
  })
  revalidatePath(adminPath)
}
