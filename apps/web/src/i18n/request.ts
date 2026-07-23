import { cookies, headers } from "next/headers"
import { getRequestConfig } from "next-intl/server"
import { siteConfig } from "~/site-config"
import { parseLocale } from "~/utils/parse-locale"

export default getRequestConfig(async () => {
  const cookie =
    (await cookies()).get(siteConfig.i18n.cookie.name)?.value || null
  const requestHeaders = await headers()
  const routeLocale = requestHeaders.get("x-novora-locale")
  const header = requestHeaders.get("Accept-Language")
  const locale = routeLocale
    ? parseLocale(routeLocale, header)
    : parseLocale(cookie, header)

  return {
    locale,
    messages: (await import(`../../../../packages/messages/src/${locale}.json`))
      .default,
  }
})
