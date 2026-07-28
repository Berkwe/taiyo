import { cn } from "@taiyomoe/ui/utils/cn"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { NextIntlClientProvider } from "next-intl"
import { getLocale, getMessages } from "next-intl/server"
import { ThemeProvider } from "next-themes"
import { siteConfig } from "~/site-config"
import type { LayoutProps } from "~/utils/types"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.baseUrl),
  title: {
    default: `${siteConfig.name} | Türkçe Webtoon, Manga ve Manhwa Oku`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  icons: {
    icon: "/assets/brand/novora-favicon.png",
    apple: "/assets/brand/novora-favicon.png",
  },
  openGraph: {
    siteName: siteConfig.name,
    type: "website",
    locale: "tr_TR",
  },
  twitter: { card: "summary_large_image" },
}

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f8" },
    { media: "(prefers-color-scheme: dark)", color: "#101112" },
  ],
}

export default async function Layout({ children }: LayoutProps) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={cn(
          "overflow-y-auto bg-background text-foreground antialiased",
          inter.className,
        )}
      >
        <a
          className="-translate-y-20 fixed top-2 left-2 z-[100] bg-nv-primary px-4 py-3 text-nv-primary-foreground focus:translate-y-0"
          href="#main-content"
        >
          İçeriğe geç
        </a>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <NextIntlClientProvider messages={messages}>
            {children}
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
