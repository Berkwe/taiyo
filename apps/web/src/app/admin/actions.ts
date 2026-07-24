"use server"

import { randomUUID } from "node:crypto"
import { cacheClient } from "@taiyomoe/cache"
import { db } from "@taiyomoe/db"
import { checksum, getStorage } from "@taiyomoe/storage"
import { parseCbz, parseImage } from "@taiyomoe/storage/cbz"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { validateRelease } from "~/features/management/release-validation"
import { requireManagementUser } from "~/features/management/server"
import {
  accountStateSchema,
  chapterInputSchema,
  formObject,
  roleInputSchema,
  seriesInputSchema,
} from "~/features/management/validation"

const adminPath = "/admin"

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
  const input = chapterInputSchema.parse(formObject(formData))
  const series = await db.series.findUniqueOrThrow({
    where: { id: input.seriesId, deletedAt: null },
    select: { originalLanguage: true },
  })
  const file = fileFrom(formData, "cbz")
  if (!file || !file.name.toLocaleLowerCase("en").endsWith(".cbz")) {
    throw new Error("Geçerli bir .cbz dosyası seçin.")
  }
  const images = parseCbz(new Uint8Array(await file.arrayBuffer()))
  const chapterId = randomUUID()
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
      await tx.platformChapter.create({
        data: {
          id: chapterId,
          seriesId: input.seriesId,
          chapterNumber: input.chapterNumber,
          canonicalSlug: input.canonicalSlug,
          sortKey: input.sortKey,
          localizations: {
            create: { locale: "tr", title: input.title || null },
          },
          releases: {
            create: {
              id: releaseId,
              targetLanguage: "tr",
              sourceLanguage: series.originalLanguage,
              translationProfileId: profile.id,
              storagePrefix,
              pageCount: pages.length,
              pages: { create: pages },
            },
          },
        },
      })
      await tx.contentRevision.createMany({
        data: [
          {
            entityType: "CHAPTER",
            entityId: chapterId,
            action: "CREATE",
            actorId: actor.id,
            after: {
              source: "CBZ",
              chapterNumber: input.chapterNumber,
              pageCount: pages.length,
            },
          },
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
    await tx.chapterRelease.update({
      where: { id },
      data: {
        status: "PUBLISHED",
        publishedAt,
        isPublic: true,
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
    await tx.chapterRelease.updateMany({
      where: { id: { in: input.ids }, deletedAt: null },
      data:
        input.action === "PUBLISH"
          ? {
              status: "PUBLISHED",
              isPublic: true,
              publishedAt,
            }
          : input.action === "DRAFT"
            ? {
                status: "DRAFT",
                isPublic: false,
                isIndexable: false,
                publishedAt: null,
              }
            : {
                status: "ARCHIVED",
                isPublic: false,
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
