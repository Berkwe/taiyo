import { redirect } from "next/navigation"
import { paths } from "~/features/platform/paths"

export default function LegacyTranslationRequestsPage() {
  redirect(paths.translateRequests("tr"))
}
