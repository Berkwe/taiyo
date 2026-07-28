export const ALLOWED_EMAIL_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "proton.me",
  "protonmail.com",
  "protonmail.ch",
  "pm.me",
  "icloud.com",
  "me.com",
  "mac.com",
  "yahoo.com",
  "yahoo.com.tr",
  "yandex.com",
  "yandex.com.tr",
  "gmx.com",
  "gmx.de",
  "mail.com",
  "aol.com",
  "zoho.com",
  "tutanota.com",
  "tuta.com",
] as const

const allowedEmailDomains = new Set<string>(ALLOWED_EMAIL_DOMAINS)

export function getEmailDomain(email: string) {
  const separator = email.lastIndexOf("@")

  return separator === -1
    ? ""
    : email
        .slice(separator + 1)
        .trim()
        .toLowerCase()
}

export function isAllowedEmailDomain(email: string) {
  return allowedEmailDomains.has(getEmailDomain(email))
}
