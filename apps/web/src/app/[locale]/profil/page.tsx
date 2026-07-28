import { notFound } from "next/navigation"
import { ProfilePage, profileMetadata } from "~/features/platform/profile-page"

export const dynamic = "force-dynamic"
export const metadata = profileMetadata("tr")

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  if ((await params).locale !== "tr") notFound()
  const tab = (await searchParams).tab === "settings" ? "settings" : "profile"
  return <ProfilePage locale="tr" tab={tab} />
}
