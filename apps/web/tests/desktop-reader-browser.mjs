import assert from "node:assert/strict"
import { chromium } from "playwright"

const baseUrl = process.env.NOVORA_BASE_URL ?? "http://localhost:3000"
const readerPath = "/tr/oku/yildiz-postanesi/1/star-post-office-ch1-tr"
const browser = await chromium.launch({ headless: true })

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  })
  await context.addInitScript(() => localStorage.clear())
  await context.addCookies([
    {
      name: "novora-debug-viewer",
      value: "USER",
      url: baseUrl,
    },
  ])
  const page = await context.newPage()

  await page.goto(`${baseUrl}/tr`, { waitUntil: "networkidle" })
  const desktopNav = page.getByRole("navigation", { name: "Ana navigasyon" })
  await desktopNav.waitFor()
  const desktopNavText = await desktopNav.innerText()
  assert.doesNotMatch(desktopNavText, /🏠|📚|🛍️|ℹ️|👤|🔑|🛠️|🚪/u)
  assert.ok((await desktopNav.locator("svg").count()) >= 5)

  await page.goto(`${baseUrl}${readerPath}`, { waitUntil: "networkidle" })
  await page.evaluate(() => scrollTo(0, 1_200))
  const beforeArrowDown = await page.evaluate(() => scrollY)
  await page.keyboard.press("ArrowDown")
  await page.waitForTimeout(400)
  assert.ok((await page.evaluate(() => scrollY)) > beforeArrowDown)
  const beforeArrowUp = await page.evaluate(() => scrollY)
  await page.keyboard.press("ArrowUp")
  await page.waitForTimeout(400)
  assert.ok((await page.evaluate(() => scrollY)) < beforeArrowUp)

  const autoScroll = page.getByRole("button", {
    name: "Otomatik kaydırmayı başlat veya duraklat",
  })
  const before = await page.evaluate(() => scrollY)
  await autoScroll.click()
  await page.waitForTimeout(750)
  const after = await page.evaluate(() => scrollY)
  assert.ok(
    after > before + 15,
    `Expected auto-scroll, got ${before} -> ${after}`,
  )
  await autoScroll.click()

  await page.goto(`${baseUrl}/tr/profil`, { waitUntil: "networkidle" })
  await page.getByRole("heading", { name: "Hesaplar" }).waitFor()
  await page.getByRole("link", { name: "Başka hesap ekle" }).waitFor()
  await page.getByLabel("Debug hesabı").waitFor()
  assert.equal(await page.locator("aside.fixed").count(), 0)

  await page.goto(`${baseUrl}/tr/profil?tab=settings`, {
    waitUntil: "networkidle",
  })
  await page.getByRole("heading", { name: "Tema" }).waitFor()
  await page.getByRole("heading", { name: "Dil" }).waitFor()
  await page.getByRole("heading", { name: "Okuyucu kısayolları" }).waitFor()
  await page.getByRole("link", { name: "Profil ayarlarına git" }).waitFor()
  const scrollDownShortcut = page.getByRole("button", { name: "Aşağı ok" })
  await scrollDownShortcut.click()
  await page.keyboard.press("k")
  await page.getByRole("button", { name: "K", exact: true }).waitFor()

  await page.goto(`${baseUrl}${readerPath}`, { waitUntil: "networkidle" })
  await page.getByRole("button", { name: "Okuyucu ayarları" }).click()
  await page.getByText("K: aşağı kaydır").waitFor()
  await page.evaluate(() => scrollTo(0, 1_200))
  const beforeCustomShortcut = await page.evaluate(() => scrollY)
  await page.keyboard.press("k")
  await page.waitForTimeout(400)
  assert.ok((await page.evaluate(() => scrollY)) > beforeCustomShortcut)
  await context.close()
} finally {
  await browser.close()
}
