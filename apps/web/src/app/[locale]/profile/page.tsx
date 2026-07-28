import { notFound } from "next/navigation"
import { ProfilePage, profileMetadata } from "~/features/platform/profile-page"

export const dynamic = "force-dynamic"
export const metadata = profileMetadata("en")

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  if ((await params).locale !== "en") notFound()
  const tab = (await searchParams).tab === "settings" ? "settings" : "profile"
  return <ProfilePage locale="en" tab={tab} />
}
