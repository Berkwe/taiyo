import { notFound } from "next/navigation"
import { ProfilePage, profileMetadata } from "~/features/platform/profile-page"

export const dynamic = "force-dynamic"
export const metadata = profileMetadata("en")

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  if ((await params).locale !== "en") notFound()
  return <ProfilePage locale="en" />
}
