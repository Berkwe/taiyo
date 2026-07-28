export function safeReturnPath(value: string | null | undefined) {
  if (!value) return "/tr"
  try {
    const decoded = decodeURIComponent(value)
    if (
      !decoded.startsWith("/") ||
      decoded.startsWith("//") ||
      decoded.includes("\\") ||
      decoded.includes("\0")
    )
      return "/tr"
    return decoded
  } catch {
    return "/tr"
  }
}
