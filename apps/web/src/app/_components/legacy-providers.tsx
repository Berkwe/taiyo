import { NuqsAdapter } from "nuqs/adapters/next/app"
import type { ReactNode } from "react"
import { AuthStoreProvider } from "~/stores/auth.store"
import { getSession } from "~/utils/get-session"
import { getSettings } from "~/utils/get-settings"
import { Providers } from "./providers"

export async function LegacyProviders({ children }: { children: ReactNode }) {
  const [session, settings] = await Promise.all([getSession(), getSettings()])

  return (
    <AuthStoreProvider session={session} settings={settings}>
      <NuqsAdapter>
        <Providers>{children}</Providers>
      </NuqsAdapter>
    </AuthStoreProvider>
  )
}
