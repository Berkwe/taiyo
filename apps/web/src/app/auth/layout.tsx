import { LegacyProviders } from "~/app/_components/legacy-providers"
import type { LayoutProps } from "~/utils/types"

export default function AuthLayout({ children }: LayoutProps) {
  return <LegacyProviders>{children}</LegacyProviders>
}
