import { redirect } from "next/navigation"
import { paths } from "~/features/platform/paths"

export default async function LegacyTranslatePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const incoming = await searchParams
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(incoming)) {
    if (typeof value === "string") query.set(key, value)
    else if (value) for (const item of value) query.append(key, item)
  }
  redirect(
    `${paths.translate("tr")}${query.size > 0 ? `?${query.toString()}` : ""}`,
  )
}
