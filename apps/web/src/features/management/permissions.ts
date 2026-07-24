export const managementRoles = ["USER", "UPLOADER", "EDITOR", "ADMIN"] as const

export type ManagementRole = (typeof managementRoles)[number]
export type ManagementPermission =
  | "series:write"
  | "chapter:write"
  | "content:publish"
  | "content:delete"
  | "users:manage"

const permissions: Record<ManagementRole, readonly ManagementPermission[]> = {
  USER: [],
  UPLOADER: ["series:write", "chapter:write"],
  EDITOR: [
    "series:write",
    "chapter:write",
    "content:publish",
    "content:delete",
  ],
  ADMIN: [
    "series:write",
    "chapter:write",
    "content:publish",
    "content:delete",
    "users:manage",
  ],
}

export function isManagementRole(role: string): role is ManagementRole {
  return managementRoles.includes(role as ManagementRole)
}

export function hasPermission(role: string, permission: ManagementPermission) {
  return isManagementRole(role) && permissions[role].includes(permission)
}
