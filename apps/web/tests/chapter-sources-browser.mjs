import assert from "node:assert/strict"
import { chromium } from "playwright"

const baseUrl = process.env.NOVORA_BASE_URL ?? "http://localhost:3000"
const seriesUrl = `${baseUrl}/tr/seri/gece-ekolari`
const browser = await chromium.launch({ headless: true })

try {
  const desktop = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  })
  const page = await desktop.newPage()
  await page.goto(seriesUrl, { waitUntil: "networkidle" })

  const chapters = page.locator(
    'section[aria-labelledby="chapters-title"] ol > li',
  )
  assert.equal(await chapters.count(), 3)
  assert.equal(await chapters.locator("img").count(), 3)
  const chapterText = await chapters.first().innerText()
  assert.match(chapterText, /TR\s*·\s*İngilizce-1\s*·\s*Premium/u)
  assert.match(chapterText, /AI çeviri/u)
  assert.doesNotMatch(
    await page
      .locator('section[aria-labelledby="chapters-title"] ol')
      .innerText(),
    /Topluluk|Kalite skoru|★|\/100|Naver|Webtoons|Kakao/iu,
  )

  const sourceButton = chapters
    .first()
    .getByRole("button", { name: "İngilizce-1", exact: true })
  await sourceButton.click()
  const sourceMenu = chapters
    .first()
    .getByRole("menu", { name: "Kaynak sürümü seç" })
  assert.match(await sourceMenu.innerText(), /İngilizce-1/u)
  assert.match(await sourceMenu.innerText(), /İngilizce-2/u)
  assert.match(await sourceMenu.innerText(), /Korece-1/u)

  const info = chapters.first().getByRole("button", {
    name: "İngilizce-1: kaynak açıklaması",
  })
  await sourceButton.click()
  await page.keyboard.press("Tab")
  assert.equal(
    await info.evaluate((element) => element === document.activeElement),
    true,
  )
  assert.match(
    await chapters.first().getByRole("tooltip").innerText(),
    /insan eliyle hazırlanmış İngilizce kaynak/u,
  )
  await page.keyboard.press("Tab")
  assert.equal(await chapters.first().getByRole("tooltip").count(), 0)

  await page.evaluate(() => {
    localStorage.setItem("novora:series-source:gece-ekolari", "ko:1")
  })
  await page.reload({ waitUntil: "networkidle" })
  assert.ok(
    await chapters
      .first()
      .getByRole("button", { name: "Korece-1", exact: true })
      .isVisible(),
  )
  await desktop.close()

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  })
  const mobilePage = await mobile.newPage()
  await mobilePage.goto(seriesUrl, { waitUntil: "networkidle" })
  const mobileInfo = mobilePage
    .locator('section[aria-labelledby="chapters-title"] ol > li')
    .first()
    .getByRole("button", { name: "İngilizce-1: kaynak açıklaması" })
  await mobileInfo.tap()
  assert.equal(await mobilePage.getByRole("tooltip").count(), 1)
  await mobilePage.locator("h1").tap()
  assert.equal(await mobilePage.getByRole("tooltip").count(), 0)
  await mobile.close()

  console.log("CHAPTER_SOURCE_BROWSER_OK")
} finally {
  await browser.close()
}
