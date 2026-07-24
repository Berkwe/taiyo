import type { ManagementRole } from "~/features/management/permissions"

export const debugViewerCookie = "novora-debug-viewer"
export type DebugViewerRole = "GUEST" | ManagementRole

export const debugAccounts: Record<
  DebugViewerRole,
  { id: string; name: string; description: string }
> = {
  GUEST: {
    id: "00000000-0000-4000-8000-000000000000",
    name: "Novora Misafiri",
    description: "Giriş yapmamış ziyaretçi",
  },
  USER: {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Deniz Okur",
    description: "Standart okuyucu",
  },
  UPLOADER: {
    id: "00000000-0000-4000-8000-000000000002",
    name: "Ece Yükleyici",
    description: "Seri ve bölüm taslağı hazırlayabilir",
  },
  EDITOR: {
    id: "00000000-0000-4000-8000-000000000003",
    name: "Mert Editör",
    description: "İçerik düzenleyip yayınlayabilir",
  },
  ADMIN: {
    id: "00000000-0000-4000-8000-000000000004",
    name: "Ada Yönetici",
    description: "Tüm yönetim görünümüne sahip",
  },
}
