import assert from "node:assert/strict"
import { chromium } from "playwright"

const baseUrl = process.env.NOVORA_BASE_URL ?? "http://localhost:3000"
const readerPath = "/tr/oku/yildiz-postanesi/1/star-post-office-ch1-tr"
const browser = await chromium.launch({ headless: true })

try {
  for (const { role, expectedProfile, expectedStatus } of [
    {
      role: "GUEST",
      expectedProfile: "Profil · Misafir",
      expectedStatus: 401,
    },
    {
      role: "USER",
      expectedProfile: "Profil · @debug_user",
      expectedStatus: 403,
    },
    {
      role: "UPLOADER",
      expectedProfile: "Profil · @debug_uploader",
      expectedStatus: 200,
    },
    {
      role: "EDITOR",
      expectedProfile: "Profil · @debug_editor",
      expectedStatus: 200,
    },
    {
      role: "ADMIN",
      expectedProfile: "Profil · @debug_admin",
      expectedStatus: 200,
    },
  ]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    })
    await context.addCookies([
      {
        name: "novora-debug-viewer",
        value: role,
        url: baseUrl,
      },
    ])
    const page = await context.newPage()
    await page.goto(`${baseUrl}/tr`, { waitUntil: "domcontentloaded" })
    const menuTrigger = page.getByRole("button", { name: "Menüyü aç" })
    await menuTrigger.click()
    const mobileNav = page.locator("[data-mobile-nav]")
    await page.waitForFunction(
      (nav) => nav?.getAttribute("data-popup-motion") === "open",
      await mobileNav.elementHandle(),
    )
    const labels = (await mobileNav.innerText()).split("\n")
    assert.deepEqual(labels.slice(0, 5), [
      "Ana sayfa",
      "Seriler",
      "Çeviri",
      "Market",
      expectedProfile,
    ])
    assert.equal(labels.at(-1), "Hakkımızda")
    assert.doesNotMatch(await mobileNav.innerText(), /🏠|📚|🛍️|ℹ️|👤|🔑|🛠️|🚪/u)
    assert.ok((await mobileNav.locator("svg").count()) >= 5)
    if (role === "GUEST") {
      await page.keyboard.press("Escape")
      await page.waitForFunction(
        (nav) => nav?.getAttribute("data-popup-motion") === "closing",
        await mobileNav.elementHandle(),
      )
      assert.equal(await mobileNav.count(), 1)
      await mobileNav.waitFor({ state: "detached" })

      await page.getByRole("button", { name: "Seri ara" }).click()
      const searchPopup = page.getByRole("region", {
        name: "Canlı seri araması",
      })
      await page.waitForFunction(
        (popup) => popup?.getAttribute("data-popup-motion") === "open",
        await searchPopup.elementHandle(),
      )
      await page.keyboard.press("Escape")
      await page.waitForFunction(
        (popup) => popup?.getAttribute("data-popup-motion") === "closing",
        await searchPopup.elementHandle(),
      )
      await searchPopup.waitFor({ state: "detached" })
    }
    const adminResponse = await page.goto(`${baseUrl}/admin`, {
      waitUntil: "domcontentloaded",
    })
    assert.equal(adminResponse?.status(), expectedStatus)
    if (role === "ADMIN") {
      await page.getByRole("heading", { name: "Kullanıcılar" }).waitFor()
      const usersSection = page.locator("#users")
      assert.ok(
        (await usersSection.getByRole("button", { name: "Ekle" }).count()) > 0,
      )
      assert.ok(
        (await usersSection.getByLabel(/için eklenecek kredi/).count()) > 0,
      )
      assert.equal(await page.getByText("Mandown kaynak kataloğu").count(), 0)
      assert.equal(
        await page
          .getByText(
            "Gerçek platform alanları yalnız bu yetkili ekranda görünür.",
          )
          .count(),
        0,
      )
      assert.ok(
        (await page.getByRole("button", { name: "Hesabı sil" }).count()) > 0,
      )
      assert.equal(
        await page
          .getByRole("button", { name: "Hesabı sil" })
          .first()
          .getAttribute("type"),
        "submit",
      )
    } else if (expectedStatus === 200) {
      assert.equal(
        await page
          .locator("#users")
          .getByRole("button", { name: "Ekle" })
          .count(),
        0,
      )
    }
    await context.close()
  }

  const guideContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  })
  const guidePage = await guideContext.newPage()
  await guidePage.goto(`${baseUrl}${readerPath}`, {
    waitUntil: "networkidle",
  })
  await guidePage.evaluate(() => scrollTo(0, 1_200))
  await guidePage.getByRole("button", { name: "Okuyucu ayarları" }).click()
  await guidePage.getByText("Rehber · İlk bölümün").waitFor()
  await guidePage.getByText("AI çeviri kaynağı ve kalitesi").waitFor()
  await guidePage.getByRole("button", { name: "Anladım" }).click()
  assert.ok(
    await guidePage.evaluate(() =>
      Boolean(localStorage.getItem("novora:guide:reader:v1")),
    ),
  )
  await guideContext.close()

  const completedContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  })
  await completedContext.addInitScript(() => {
    localStorage.setItem(
      "novora:progress:yildiz-postanesi:1",
      JSON.stringify({
        releaseId: "star-post-office-ch1-tr",
        chapterId: "star-post-office-chapter-1",
        pageNumber: 3,
        scrollRatio: 1,
        updatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      }),
    )
  })
  const completedPage = await completedContext.newPage()
  await completedPage.goto(`${baseUrl}${readerPath}`, {
    waitUntil: "networkidle",
  })
  await completedPage.waitForTimeout(500)
  assert.match(completedPage.url(), /\/1\/star-post-office-ch1-tr$/)
  await completedPage.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto"
    scrollTo(0, document.documentElement.scrollHeight)
  })
  await completedPage.waitForTimeout(300)
  const translationSuggestion = completedPage.getByRole("link", {
    name: "Diğer bölümü AI ile çevir",
  })
  assert.equal(
    await translationSuggestion.count(),
    0,
    "translation prompt appeared before the latest chapter",
  )
  await completedPage.mouse.wheel(0, 500)
  await completedPage.waitForURL(/\/2\/star-post-office-ch2-tr$/)
  await completedPage.goto(
    `${baseUrl}/tr/oku/yildiz-postanesi/3/star-post-office-ch3-tr`,
    { waitUntil: "networkidle" },
  )
  await completedPage.mouse.click(300, 600)
  await completedPage.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto"
    scrollTo(0, document.documentElement.scrollHeight)
  })
  await translationSuggestion.waitFor()
  const translationPrompt = completedPage.getByLabel(
    "Sonraki bölümü çevirme önerisi",
  )
  await translationPrompt
    .getByRole("heading", {
      name: "Hay aksi, son bölüme geldik. Sonraki bölümü AI ile çevirip birkaç dakika içinde okumak ister misiniz?",
    })
    .waitFor()
  await completedPage.waitForTimeout(300)
  assert.equal(
    Math.round((await translationPrompt.boundingBox())?.y ?? -1),
    12,
    "mobile translation prompt did not keep its top margin",
  )
  await completedPage.mouse.click(300, 700)
  await completedPage.waitForTimeout(200)
  assert.ok(
    ((await translationPrompt.boundingBox())?.y ?? 0) >= 60,
    "translation prompt did not move below the opened reader toolbar",
  )
  assert.match(
    (await translationSuggestion.getAttribute("href")) ?? "",
    /selectionMode=range/,
  )
  assert.match(
    (await translationSuggestion.getAttribute("href")) ?? "",
    /quality=premium/,
  )
  assert.match(
    (await translationSuggestion.getAttribute("href")) ?? "",
    /outputLanguage=tr/,
  )
  assert.match(completedPage.url(), /\/3\/star-post-office-ch3-tr$/)
  await completedContext.close()

  const touchTransitionContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  })
  const touchTransitionPage = await touchTransitionContext.newPage()
  await touchTransitionPage.goto(`${baseUrl}${readerPath}`, {
    waitUntil: "networkidle",
  })
  await touchTransitionPage.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto"
    scrollTo(0, document.documentElement.scrollHeight)
  })
  await touchTransitionPage.waitForTimeout(300)
  assert.match(touchTransitionPage.url(), /\/1\/star-post-office-ch1-tr$/)
  const touchTransitionCdp =
    await touchTransitionContext.newCDPSession(touchTransitionPage)
  await touchTransitionCdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ id: 1, x: 195, y: 620, radiusX: 4, radiusY: 4, force: 1 }],
  })
  await touchTransitionCdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ id: 1, x: 195, y: 420, radiusX: 4, radiusY: 4, force: 1 }],
  })
  await touchTransitionCdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  })
  await touchTransitionPage.waitForURL(/\/2\/star-post-office-ch2-tr$/)
  await touchTransitionContext.close()

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  })
  const page = await context.newPage()
  /** @type {string[]} */
  const browserErrors = []
  page.on("pageerror", (error) => browserErrors.push(error.message))
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text())
  })
  await page.goto(`${baseUrl}${readerPath}`, { waitUntil: "networkidle" })

  const siteHeader = page.locator(".site-header")
  assert.equal((await siteHeader.boundingBox())?.y, 0)
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto"
    scrollTo(0, 1_200)
  })
  assert.ok(((await siteHeader.boundingBox())?.y ?? 0) < 0)
  assert.equal(
    await siteHeader.evaluate((header) => getComputedStyle(header).transform),
    "none",
  )

  const readerToolbar = page.locator("header[data-reader-controls]")
  const backToTop = page.getByRole("button", { name: "Bölüm başına dön" })
  const reportButton = page.getByRole("button", { name: "İçeriği bildir" })
  const buttonMotion = await reportButton.evaluate((button) => {
    const buttonStyle = getComputedStyle(button)
    const icon = button.querySelector("svg")
    const iconStyle = icon ? getComputedStyle(icon) : null
    return {
      duration: buttonStyle.transitionDuration,
      properties: buttonStyle.transitionProperty,
      iconProperties: iconStyle?.transitionProperty ?? "",
    }
  })
  assert.match(buttonMotion.properties, /translate/)
  assert.match(buttonMotion.properties, /scale/)
  assert.match(buttonMotion.duration, /0\.19s/)
  assert.match(buttonMotion.iconProperties, /rotate/)
  assert.match(buttonMotion.iconProperties, /scale/)

  const arrowWithControls = await backToTop.boundingBox()
  assert.ok(arrowWithControls)
  await page.touchscreen.tap(300, 600)
  assert.match(
    (await readerToolbar.getAttribute("class")) ?? "",
    /-translate-y-full/,
  )
  assert.equal(
    await siteHeader.evaluate((header) => getComputedStyle(header).transform),
    "none",
  )
  await page.waitForTimeout(250)
  const arrowWithoutControls = await backToTop.boundingBox()
  assert.ok(arrowWithoutControls)
  assert.ok(arrowWithoutControls.y > arrowWithControls.y)
  await page.mouse.wheel(0, 400)
  assert.match(
    (await readerToolbar.getAttribute("class")) ?? "",
    /-translate-y-full/,
  )
  await page.touchscreen.tap(300, 600)
  assert.match(
    (await readerToolbar.getAttribute("class")) ?? "",
    /translate-y-0/,
  )
  await page.waitForTimeout(250)
  const arrowWithControlsAgain = await backToTop.boundingBox()
  assert.ok(arrowWithControlsAgain)
  assert.ok(arrowWithControlsAgain.y < arrowWithoutControls.y)
  await backToTop.tap()
  await page.waitForFunction(() => scrollY === 0)
  await page.evaluate(() => scrollTo(0, 1_200))

  const autoScroll = page.getByRole("button", {
    name: "Otomatik kaydırmayı başlat veya duraklat",
  })
  const progressSlider = page.getByRole("slider", {
    name: "Okuma ilerlemesi",
  })
  const progressBox = await progressSlider.boundingBox()
  assert.ok(progressBox)
  const cdp = await context.newCDPSession(page)
  /** @param {number} y */
  const touchPoint = (y) => ({
    id: 1,
    x: progressBox.x + progressBox.width / 2,
    y,
    radiusX: 3,
    radiusY: 3,
    force: 1,
  })
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [touchPoint(progressBox.y + 24)],
  })
  for (const ratio of [0.35, 0.55, 0.75, 1]) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [touchPoint(progressBox.y + progressBox.height * ratio)],
    })
  }
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  })
  await page.waitForTimeout(150)
  assert.ok(Number(await progressSlider.inputValue()) >= 999)
  assert.match(page.url(), /\/1\/star-post-office-ch1-tr$/)

  await autoScroll.tap()
  await page.waitForTimeout(600)
  assert.match(page.url(), /\/1\/star-post-office-ch1-tr$/)
  await page.evaluate(() => scrollTo(0, 1_200))

  await autoScroll.tap()
  const beforeAutoScroll = await page.evaluate(() => scrollY)
  await page.waitForTimeout(500)
  assert.ok((await page.evaluate(() => scrollY)) > beforeAutoScroll)
  await autoScroll.tap()
  await page.waitForTimeout(100)
  const pausedAt = await page.evaluate(() => scrollY)
  await page.waitForTimeout(400)
  assert.equal(await page.evaluate(() => scrollY), pausedAt)

  await reportButton.tap()
  const reportDialog = page.getByRole("dialog")
  await page.waitForFunction(
    (dialog) => dialog?.getAttribute("data-popup-motion") === "open",
    await reportDialog.elementHandle(),
  )
  await page.waitForFunction(
    () =>
      document.documentElement.style.overflow === "hidden" &&
      document.body.style.overflow === "hidden",
  )
  const scrollBeforeLockedDialog = await page.evaluate(() => scrollY)
  await page.mouse.wheel(0, 500)
  await page.waitForTimeout(100)
  assert.equal(await page.evaluate(() => scrollY), scrollBeforeLockedDialog)
  await page.getByRole("button", { name: "Paneli bildir" }).tap()
  await page.getByRole("button", { name: "Bölümden seç" }).tap()
  await page.waitForFunction(
    () =>
      document.documentElement.style.overflow !== "hidden" &&
      document.body.style.overflow !== "hidden",
  )
  const selectionBar = page.getByRole("button", {
    name: "Üst seçim çubuğu",
  })
  assert.equal((await selectionBar.boundingBox())?.width, 390)
  const bottomSelectionBar = page.getByRole("button", {
    name: "Alt seçim çubuğu",
  })
  const bottomSelectionBox = await bottomSelectionBar.boundingBox()
  assert.ok(bottomSelectionBox)
  await page.mouse.move(195, bottomSelectionBox.y + 16)
  await page.mouse.down()
  await page.mouse.move(195, 775)
  await page.waitForTimeout(7_000)
  await page.mouse.up()
  const selectedDomRange = await page
    .locator("[data-reader-selection-box]")
    .evaluate((box) => {
      const rect = box.getBoundingClientRect()
      return {
        start: rect.top + scrollY,
        end: rect.bottom + scrollY,
      }
    })
  await page.getByRole("button", { name: "Ekle", exact: true }).tap()
  const selectionPreview = page.locator("[data-selection-pages]")
  await selectionPreview.waitFor()
  assert.equal(
    await selectionPreview.getAttribute("data-selection-pages"),
    "1-3",
  )
  const selectionHeight = Number(
    await selectionPreview.getAttribute("data-selection-height"),
  )
  assert.ok(
    Math.abs(
      Number(await selectionPreview.getAttribute("data-selection-start")) -
        selectedDomRange.start,
    ) < 1,
  )
  assert.ok(
    Math.abs(
      Number(await selectionPreview.getAttribute("data-selection-end")) -
        selectedDomRange.end,
    ) < 1,
  )
  const preview = page.locator('img[alt="Rapor eki önizlemesi"]')
  await preview.waitFor()
  const cropColorError = await preview.evaluate(
    async (previewImage, selectedRange) => {
      const sampleOffset = Math.min(
        24,
        (selectedRange.end - selectedRange.start) / 4,
      )
      const sampleY = selectedRange.start + sampleOffset
      const pageElement = [
        ...document.querySelectorAll("[data-page-number]"),
      ].find((element) => {
        const rect = element.getBoundingClientRect()
        const pageTop = rect.top + scrollY
        return sampleY >= pageTop && sampleY <= pageTop + rect.height
      })
      const pageImage = pageElement?.querySelector("img")
      if (!pageElement || !pageImage) return Number.POSITIVE_INFINITY
      const pageRect = pageElement.getBoundingClientRect()
      const pageTop = pageRect.top + scrollY
      const decodedSource = new Image()
      decodedSource.src = pageImage.currentSrc || pageImage.src
      await decodedSource.decode()

      /**
       * @param {CanvasImageSource} image
       * @param {number} sourceX
       * @param {number} sourceY
       */
      const samplePixel = (image, sourceX, sourceY) => {
        const canvas = document.createElement("canvas")
        canvas.width = 1
        canvas.height = 1
        const context = canvas.getContext("2d")
        if (!context) return [0, 0, 0]
        context.drawImage(image, sourceX, sourceY, 1, 1, 0, 0, 1, 1)
        return [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)]
      }

      const sourceY =
        ((sampleY - pageTop) / pageRect.height) * decodedSource.naturalHeight
      const previewY =
        (sampleOffset / (selectedRange.end - selectedRange.start)) *
        /** @type {HTMLImageElement} */ (previewImage).naturalHeight
      const channelErrors = [0.25, 0.5, 0.75].flatMap((ratio) => {
        const expected = samplePixel(
          decodedSource,
          decodedSource.naturalWidth * ratio,
          sourceY,
        )
        const actual = samplePixel(
          /** @type {HTMLImageElement} */ (previewImage),
          /** @type {HTMLImageElement} */ (previewImage).naturalWidth * ratio,
          previewY,
        )
        return expected.map((value, index) =>
          Math.abs(value - (actual[index] ?? 0)),
        )
      })
      return (
        channelErrors.reduce((total, value) => total + value, 0) /
        channelErrors.length
      )
    },
    selectedDomRange,
  )
  assert.ok(cropColorError < 35)
  const previewSize = await preview.evaluate((image) => ({
    width: /** @type {HTMLImageElement} */ (image).naturalWidth,
    height: /** @type {HTMLImageElement} */ (image).naturalHeight,
  }))
  assert.equal(previewSize.width, 1_080)
  assert.equal(
    previewSize.height,
    Math.min(8_000, Math.round((selectionHeight / 390) * 1_080)),
  )
  const firstSelectionDigest = await preview.evaluate(async (image) => {
    const response = await fetch(
      /** @type {HTMLImageElement} */ (image).currentSrc,
    )
    const digest = await crypto.subtle.digest(
      "SHA-256",
      await response.arrayBuffer(),
    )
    return Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("")
  })

  await page.getByRole("button", { name: "Rapor penceresini kapat" }).tap()
  await page.waitForFunction(
    (dialog) => dialog?.getAttribute("data-popup-motion") === "closing",
    await reportDialog.elementHandle(),
  )
  await reportDialog.waitFor({ state: "detached" })
  await page.touchscreen.tap(300, 600)
  await page.evaluate(() => scrollTo(0, 2_200))
  await page.getByRole("button", { name: "İçeriği bildir" }).tap()
  await page.getByRole("button", { name: "Paneli bildir" }).tap()
  await page.getByRole("button", { name: "Bölümden seç" }).tap()
  await page.getByRole("button", { name: "Ekle", exact: true }).tap()

  await page.waitForFunction(
    () =>
      document
        .querySelector("[data-selection-pages]")
        ?.getAttribute("data-selection-pages") !== "1-3",
  )
  const secondSelectionPreview = page.locator('img[alt="Rapor eki önizlemesi"]')
  await secondSelectionPreview.waitFor()
  const secondSelectionDigest = await secondSelectionPreview.evaluate(
    async (image) => {
      const response = await fetch(
        /** @type {HTMLImageElement} */ (image).currentSrc,
      )
      const digest = await crypto.subtle.digest(
        "SHA-256",
        await response.arrayBuffer(),
      )
      return Array.from(new Uint8Array(digest), (byte) =>
        byte.toString(16).padStart(2, "0"),
      ).join("")
    },
  )
  assert.notEqual(secondSelectionDigest, firstSelectionDigest)
  assert.notEqual(
    await page
      .locator("[data-selection-pages]")
      .getAttribute("data-selection-pages"),
    "1-3",
  )
  assert.deepEqual(browserErrors, [])
  await context.close()
} finally {
  await browser.close()
}
