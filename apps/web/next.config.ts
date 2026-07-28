import { networkInterfaces } from "node:os"
import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"
import "./src/env"

const localDevelopmentOrigins = Object.values(networkInterfaces())
  .flat()
  .filter((address): address is NonNullable<typeof address> =>
    Boolean(address && address.family === "IPv4" && !address.internal),
  )
  .map((address) => address.address)

const config = {
  allowedDevOrigins: localDevelopmentOrigins,
  reactStrictMode: true,
  reactCompiler: true,
  experimental: {
    authInterrupts: true,
    serverActions: { bodySizeLimit: "105mb" },
  },
  images: {
    minimumCacheTTL: 300,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.taiyo.moe",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },

  /** Enables hot reloading for local packages without a build step */
  transpilePackages: [
    "@taiyomoe/auth",
    "@taiyomoe/db",
    "@taiyomoe/storage",
    "@taiyomoe/utils",
  ],

  /** We already do typechecking as a separate task in CI */
  typescript: { ignoreBuildErrors: true },

  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
        {
          key: "Content-Security-Policy",
          value:
            "base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'",
        },
      ],
    },
  ],

  /** PostHog-related configuration */
  rewrites: async () => [
    {
      source: "/ingest/static/:path*",
      destination: "https://us-assets.i.posthog.com/static/:path*",
    },
    {
      source: "/ingest/:path*",
      destination: "https://us.i.posthog.com/:path*",
    },
    {
      source: "/ingest/decide",
      destination: "https://us.i.posthog.com/decide",
    },
  ],
  skipTrailingSlashRedirect: true,
} satisfies NextConfig

const withNextIntl = createNextIntlPlugin()

export default withNextIntl(config)
