import { db } from "@taiyomoe/db"
import { getStorage } from "@taiyomoe/storage"

export interface ReleaseValidationIssue {
  code:
    | "NO_PAGES"
    | "PAGE_GAP"
    | "LOW_RESOLUTION"
    | "ZERO_SIZE"
    | "MISSING_STORAGE"
    | "CHECKSUM_MISMATCH"
  pageNumber?: number
  message: string
}

export async function validateRelease(releaseId: string) {
  const release = await db.chapterRelease.findUniqueOrThrow({
    where: { id: releaseId, deletedAt: null },
    include: { pages: { orderBy: { pageNumber: "asc" } } },
  })
  const issues: ReleaseValidationIssue[] = []
  if (!release.pages.length) {
    issues.push({ code: "NO_PAGES", message: "Sürümde görsel bulunmuyor." })
  }
  for (const [index, page] of release.pages.entries()) {
    if (page.pageNumber !== index + 1) {
      issues.push({
        code: "PAGE_GAP",
        pageNumber: page.pageNumber,
        message: `Sayfa sırası ${index + 1} yerine ${page.pageNumber}.`,
      })
    }
    if (page.width < 480 || page.height < 480) {
      issues.push({
        code: "LOW_RESOLUTION",
        pageNumber: page.pageNumber,
        message: "Görsel çözünürlüğü 480px altına düşüyor.",
      })
    }
    if (page.fileSize === 0n) {
      issues.push({
        code: "ZERO_SIZE",
        pageNumber: page.pageNumber,
        message: "Görsel dosyası sıfır bayt.",
      })
    }
    const object = await getStorage().read(page.storageKey)
    if (!object) {
      issues.push({
        code: "MISSING_STORAGE",
        pageNumber: page.pageNumber,
        message: "Storage objesi bulunamadı.",
      })
    }
  }
  return {
    releaseId,
    pageCount: release.pages.length,
    valid: issues.length === 0,
    issues,
  }
}
