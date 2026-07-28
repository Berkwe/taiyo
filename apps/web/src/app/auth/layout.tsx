import type { Metadata } from "next"
import { LegacyProviders } from "~/app/_components/legacy-providers"
import type { LayoutProps } from "~/utils/types"

export const metadata: Metadata = {
  title: "Hesap | NovoraScans",
  description:
    "NovoraScans hesabına güvenli şekilde giriş yap veya yeni hesap oluştur.",
  robots: { index: false, follow: false },
}

export default function AuthLayout({ children }: LayoutProps) {
  return <LegacyProviders>{children}</LegacyProviders>
}
