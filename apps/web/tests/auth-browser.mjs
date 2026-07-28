import assert from "node:assert/strict"
import { chromium } from "playwright"

const baseUrl = process.env.NOVORA_BASE_URL ?? "http://localhost:3000"
const browser = await chromium.launch({ headless: true })

try {
  const page = await browser.newPage()
  await page.goto(`${baseUrl}/auth/sign-in`, {
    waitUntil: "domcontentloaded",
  })

  const email = page.locator('input[name="email"]')
  const password = page.locator('input[name="password"]')
  await email.fill("reader@gmail.com")
  await password.fill("kept-in-memory")
  await page
    .locator('form button[type="button"]')
    .filter({ hasText: /\S/ })
    .click()

  await email.waitFor()
  assert.equal(await email.inputValue(), "reader@gmail.com")

  await page
    .locator('button[type="button"]')
    .filter({ hasText: /\S/ })
    .first()
    .click()
  await password.waitFor()
  assert.equal(await email.inputValue(), "reader@gmail.com")
  assert.equal(await password.inputValue(), "kept-in-memory")

  await page.locator('a[href="/auth/sign-up"]').click()
  await page.waitForURL("**/auth/sign-up")
  await page.locator('a[href="/auth/sign-in"]').click()
  await page.waitForURL("**/auth/sign-in")

  assert.equal(await page.locator('input[name="email"]').inputValue(), "")
  assert.equal(await page.locator('input[name="password"]').inputValue(), "")
} finally {
  await browser.close()
}
