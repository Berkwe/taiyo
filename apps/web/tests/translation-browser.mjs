import assert from "node:assert/strict"
import { mkdir } from "node:fs/promises"
import { chromium } from "playwright"

const baseUrl = process.env.NOVORA_BASE_URL ?? "http://localhost:3000"
const artifactDir = "artifacts/translation"
await mkdir(artifactDir, { recursive: true })
const browser = await chromium.launch({ headless: true })

try {
  const loadingContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  })
  const loadingPage = await loadingContext.newPage()
  await loadingPage.goto(`${baseUrl}/translate`, { waitUntil: "networkidle" })
  let searchRequestCount = 0
  loadingPage.on("request", (request) => {
    if (
      request.url().includes("/api/translation/catalog?q=") &&
      request.method() === "GET"
    )
      searchRequestCount += 1
  })
  await loadingPage
    .getByRole("textbox", { name: "Seri adı" })
    .fill("Tower of God")
  const loadingIndicator = loadingPage.getByLabel("Seriler aranıyor")
  if (
    await loadingIndicator
      .waitFor({ state: "visible", timeout: 500 })
      .then(() => true)
      .catch(() => false)
  )
    assert.equal(
      await loadingIndicator.locator(":scope > div > div").count(),
      2,
    )
  await loadingPage.getByRole("heading", { name: "Arama sonuçları" }).waitFor()
  assert.ok(
    (await loadingPage
      .getByRole("region", { name: "Arama sonuçları" })
      .getByRole("link")
      .count()) > 0,
  )
  await loadingPage
    .getByRole("heading", { name: "Tower of God", exact: true })
    .waitFor()
  assert.equal(
    searchRequestCount,
    1,
    "debounced search made duplicate requests",
  )
  assert.equal(await loadingPage.getByLabel("Seriler aranıyor").count(), 0)
  await loadingPage.getByText("Sinui Tap", { exact: true }).waitFor()
  await loadingPage.getByText("신의 탑", { exact: true }).waitFor()
  await loadingPage.getByText("Devam ediyor", { exact: true }).waitFor()
  await loadingPage.getByText("Manga", { exact: true }).first().waitFor()
  await loadingPage.getByAltText("Tower of God kapağı").evaluate(
    (image) =>
      new Promise((resolve, reject) => {
        if (image instanceof HTMLImageElement && image.naturalWidth > 0)
          return resolve(true)
        image.addEventListener("load", () => resolve(true), { once: true })
        image.addEventListener(
          "error",
          () => reject(new Error("cover failed")),
          {
            once: true,
          },
        )
      }),
  )
  await loadingContext.close()

  for (const scenario of [
    {
      heading: "Sonuç bulunamadı",
      status: 200,
      body: { results: [] },
    },
    {
      heading: "Arama yapılamadı",
      status: 503,
      body: { error: "Kaynak kataloğuna şu anda ulaşılamıyor." },
    },
    {
      heading: "Arama sınırına ulaşıldı",
      status: 429,
      headers: { "Retry-After": "30" },
      body: { error: "Çok fazla istek gönderdiniz.", retryAfter: 30 },
    },
  ]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    })
    const page = await context.newPage()
    await page.route("**/api/translation/catalog?q=*", (route) =>
      route.fulfill({
        body: JSON.stringify(scenario.body),
        contentType: "application/json",
        headers: scenario.headers,
        status: scenario.status,
      }),
    )
    await page.goto(`${baseUrl}/translate`, { waitUntil: "networkidle" })
    await page.getByRole("textbox", { name: "Seri adı" }).fill("fixture")
    await page.getByRole("heading", { name: scenario.heading }).waitFor()
    if (scenario.status === 429)
      await page.getByText(/30 saniye sonra/).waitFor()
    await context.close()
  }

  const multipleSourceContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  })
  const multipleSourcePage = await multipleSourceContext.newPage()
  let multipleSourceSearchRequests = 0
  multipleSourcePage.on("request", (request) => {
    const url = new URL(request.url())
    if (
      url.pathname === "/api/translation/catalog" &&
      url.searchParams.has("q")
    )
      multipleSourceSearchRequests += 1
  })
  await multipleSourcePage.route(
    "**/api/translation/catalog?seriesId=*&sourceEditionId=*",
    async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 750))
      await route.continue()
    },
  )
  await multipleSourcePage.goto(
    `${baseUrl}/translate?q=${encodeURIComponent("Omniscient Reader")}`,
    { waitUntil: "networkidle" },
  )
  const multipleSourceTitle = multipleSourcePage.getByRole("heading", {
    name: "Omniscient Reader",
    exact: true,
  })
  const multipleSourceCard = multipleSourcePage.getByRole("link").filter({
    has: multipleSourceTitle,
  })
  assert.equal(
    await multipleSourceTitle.evaluate(
      (heading) => getComputedStyle(heading).userSelect,
    ),
    "text",
  )
  const selectableTitleBox = await multipleSourceTitle.boundingBox()
  assert.ok(selectableTitleBox)
  await multipleSourcePage.mouse.move(
    selectableTitleBox.x + selectableTitleBox.width - 3,
    selectableTitleBox.y + selectableTitleBox.height / 2,
  )
  await multipleSourcePage.mouse.down()
  await multipleSourcePage.mouse.move(
    selectableTitleBox.x + 3,
    selectableTitleBox.y + selectableTitleBox.height / 2,
    { steps: 10 },
  )
  await multipleSourcePage.mouse.up()
  assert.match(
    await multipleSourcePage.evaluate(
      () => window.getSelection()?.toString() ?? "",
    ),
    /Omniscient Reader/,
  )
  assert.equal(
    await multipleSourceCard.evaluate((card) => card.matches(":active")),
    false,
  )
  assert.equal(
    await multipleSourcePage
      .getByRole("heading", { name: "Kaynak seç" })
      .count(),
    0,
  )
  await multipleSourcePage.evaluate(() =>
    window.getSelection()?.removeAllRanges(),
  )
  const multipleSourceSelection = multipleSourcePage.waitForResponse(
    (candidate) =>
      candidate.url().endsWith("/api/translation/catalog") &&
      candidate.request().method() === "POST",
  )
  await multipleSourceCard.click()
  assert.equal((await multipleSourceSelection).status(), 200)
  assert.equal(new URL(multipleSourcePage.url()).pathname, "/translate")
  await multipleSourcePage
    .getByRole("heading", { name: "Kaynak seç" })
    .waitFor()
  const backButton = multipleSourcePage.getByRole("button", {
    name: "Aranan serilere dön",
  })
  const backBox = await backButton.boundingBox()
  const coverBox = await multipleSourcePage
    .getByRole("img", { name: "Omniscient Reader kapağı" })
    .boundingBox()
  assert.ok(backBox && coverBox && backBox.y < coverBox.y)
  await multipleSourcePage
    .getByLabel("İngilizce-1 mevcut bölümler yükleniyor")
    .waitFor()
  await multipleSourcePage
    .getByLabel("İngilizce-1 son bölüm yükleniyor")
    .waitFor()
  await multipleSourcePage
    .getByRole("button", { name: "İngilizce-1", exact: true })
    .waitFor()
  await multipleSourcePage
    .getByRole("button", { name: "Korece-1", exact: true })
    .waitFor()
  await multipleSourcePage
    .getByRole("button", { name: "İngilizce-1: kaynak açıklaması" })
    .hover()
  await multipleSourcePage
    .getByRole("tooltip")
    .getByText(
      "Standart ingilizce kaynak, genelde koreceden çevrilmiş kaliteli seriler bulunur. Çevirimi daha ucuz ve kalitelidir.",
      { exact: true },
    )
    .waitFor()
  assert.equal(
    await multipleSourcePage
      .getByRole("button", { name: /Naver Series|WEBTOON|MangaDex/ })
      .count(),
    0,
  )
  assert.equal(multipleSourceSearchRequests, 1)
  await backButton.click()
  await multipleSourcePage
    .getByRole("heading", { name: "Arama sonuçları" })
    .waitFor()
  await multipleSourcePage
    .getByRole("heading", { name: "Omniscient Reader", exact: true })
    .waitFor()
  assert.equal(multipleSourceSearchRequests, 1)
  await multipleSourceContext.close()

  for (const viewport of [
    { name: "mobile", width: 390, height: 844 },
    { name: "desktop", width: 1280, height: 900 },
  ]) {
    const context = await browser.newContext({
      hasTouch: viewport.name === "mobile",
      viewport,
    })
    const page = await context.newPage()
    const response = await page.goto(
      `${baseUrl}/translate?q=${encodeURIComponent("Tower of God")}`,
      { waitUntil: "networkidle" },
    )
    assert.equal(response?.status(), 200)
    await page.getByRole("heading", { name: "Webtoon AI Çevir" }).waitFor()
    const tower = page.getByRole("link").filter({
      has: page.getByRole("heading", { name: "Tower of God", exact: true }),
    })
    await tower.waitFor()
    const selectionResponse = page.waitForResponse(
      (candidate) =>
        candidate.url().endsWith("/api/translation/catalog") &&
        candidate.request().method() === "POST",
    )
    await tower.click()
    assert.equal((await selectionResponse).status(), 200)
    assert.equal(new URL(page.url()).pathname, "/translate")
    await page.getByRole("heading", { name: "AI çeviri seçimi" }).waitFor()
    assert.equal(
      await page.getByRole("heading", { name: "Kaynak seç" }).count(),
      0,
    )
    const detailCover = page.getByAltText("Tower of God kapağı")
    await detailCover.evaluate(
      (image) =>
        new Promise((resolve, reject) => {
          if (image instanceof HTMLImageElement && image.naturalWidth > 0)
            return resolve(true)
          image.addEventListener("load", () => resolve(true), { once: true })
          image.addEventListener(
            "error",
            () => reject(new Error("detail cover failed")),
            { once: true },
          )
        }),
    )
    const coverBox = await detailCover.boundingBox()
    assert.ok(coverBox)
    const changeSourceBox = await page
      .getByRole("button", { name: "Kaynağı değiştir" })
      .boundingBox()
    assert.ok(changeSourceBox && changeSourceBox.y < coverBox.y)
    assert.equal(Math.round(coverBox.width), viewport.width < 640 ? 76 : 112)
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      true,
      "translation series card overflowed the viewport",
    )
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      true,
      "translation detail overflowed the mobile viewport",
    )
    await page.getByRole("button", { name: "Bölüm aralığı" }).click()
    await page.getByRole("textbox", { name: "Başlangıç bölümü" }).fill("3")
    await page.getByRole("textbox", { name: "Bitiş bölümü" }).fill("5")
    assert.equal(
      await page.getByRole("button", { name: /Bu Bölümü Şimdi Çevir/ }).count(),
      0,
    )
    const quoteResponse = page.waitForResponse(
      (candidate) =>
        candidate.url().endsWith("/api/translation/quote") &&
        candidate.request().method() === "POST",
    )
    await page.getByRole("button", { name: /Dengeli AI/ }).click()
    const receivedQuoteResponse = await quoteResponse
    assert.equal(
      await page.getByRole("button", { name: /AI çeviri Aktif/ }).count(),
      0,
    )
    assert.equal(await page.getByText("2. Çeviri türü").count(), 0)
    await page
      .getByText("Başlangıç ve bitiş dahil, aradaki tüm bölümler çevrilecek.")
      .waitFor()
    await page.getByText("Çevrilecek bölümler: 3, 4, 5").waitFor()
    assert.equal(
      await page
        .getByRole("slider", { name: "Başlangıç bölümünü kaydır" })
        .count(),
      1,
    )
    assert.equal(
      await page.getByRole("slider", { name: "Bitiş bölümünü kaydır" }).count(),
      1,
    )
    assert.equal(
      await page.getByRole("textbox", { name: "Başlangıç bölümü" }).count(),
      1,
    )
    assert.equal(
      await page.getByRole("textbox", { name: "Bitiş bölümü" }).count(),
      1,
    )
    assert.equal(
      receivedQuoteResponse.status(),
      200,
      await receivedQuoteResponse.text(),
    )
    await page
      .getByRole("button", { name: /Seçili Bölümleri Şimdi Çevir/ })
      .waitFor()
    await page.getByRole("textbox", { name: "Bitiş bölümü" }).fill("3")
    await page.getByRole("button", { name: /Bu Bölümü Şimdi Çevir/ }).waitFor()
    const restoredQuote = page.waitForResponse(
      (candidate) =>
        candidate.url().endsWith("/api/translation/quote") &&
        candidate.request().method() === "POST",
    )
    const restoredBatchQuote = page.waitForResponse(
      (candidate) =>
        candidate.url().endsWith("/api/translation/batches/quote") &&
        candidate.request().method() === "POST",
    )
    await page.getByRole("textbox", { name: "Bitiş bölümü" }).fill("5")
    await Promise.all([restoredQuote, restoredBatchQuote])
    await page
      .getByRole("button", { name: /Seçili Bölümleri Şimdi Çevir/ })
      .waitFor()
    await page
      .getByText("Talebi tamamlamak için gereken", { exact: false })
      .waitFor()
    await page
      .getByRole("heading", { name: "AI çeviri talebi", exact: true })
      .waitFor()
    assert.equal(await page.getByRole("button", { name: "+25" }).count(), 0)
    const communityButton = page.getByRole("button", {
      name: /^Yeni topluluk talebi(?: ·|$)/,
    })
    assert.equal(await communityButton.isDisabled(), true)
    const communityHelp = page.getByRole("button", {
      name: "Yeni topluluk talebi nasıl çalışır?",
    })
    if (viewport.name === "mobile") await communityHelp.tap()
    else await communityHelp.hover()
    await page
      .getByRole("tooltip")
      .getByText(/Herkes kredi ekleyebilir/)
      .waitFor()
    await page.getByRole("button", { name: "+10 ekle" }).click()
    await page.waitForFunction(() => {
      const button = [...document.querySelectorAll("button")].find((item) =>
        item.textContent?.startsWith("Yeni topluluk talebi"),
      )
      return button instanceof HTMLButtonElement && !button.disabled
    })
    assert.equal(await communityButton.isEnabled(), true)
    await page.getByRole("button", { name: "Özel tutar belirle" }).click()
    await page.getByRole("spinbutton", { name: "Özel kredi tutarı" }).fill("17")
    assert.equal(
      await page.getByRole("button", { name: "Seç", exact: true }).isEnabled(),
      true,
    )
    assert.equal(
      await page
        .getByRole("button", {
          name: /Naver Series|WEBTOON|MangaDex|Naver Webtoon/,
        })
        .count(),
      0,
      "real source provider was visible",
    )
    await page.screenshot({
      fullPage: true,
      path: `${artifactDir}/${viewport.name}.png`,
    })
    await context.close()
  }

  const guestContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  })
  await guestContext.addCookies([
    {
      name: "novora-debug-viewer",
      value: "GUEST",
      url: baseUrl,
    },
  ])
  const guestPage = await guestContext.newPage()
  await guestPage.goto(
    `${baseUrl}/translate?q=${encodeURIComponent("Tower of God")}`,
    { waitUntil: "networkidle" },
  )
  const guestSelectionResponse = guestPage.waitForResponse(
    (candidate) =>
      candidate.url().endsWith("/api/translation/catalog") &&
      candidate.request().method() === "POST",
  )
  await guestPage
    .getByRole("link")
    .filter({
      has: guestPage.getByRole("heading", {
        name: "Tower of God",
        exact: true,
      }),
    })
    .click()
  assert.equal((await guestSelectionResponse).status(), 200)
  assert.equal(new URL(guestPage.url()).pathname, "/translate")
  await guestPage.getByRole("heading", { name: "AI çeviri seçimi" }).waitFor()
  await guestPage.getByRole("button", { name: "Tek bölüm" }).click()
  await guestPage.getByRole("button", { name: /Dengeli AI/ }).click()
  await guestPage.getByRole("button", { name: /Bu Bölümü Şimdi Çevir/ }).click()
  await guestPage
    .getByRole("heading", { name: "Önce giriş yapmalısın" })
    .waitFor()
  await guestPage.getByRole("button", { name: "Giriş yap" }).waitFor()
  await guestPage.getByRole("button", { name: "İptal" }).click()
  assert.equal(
    await guestPage
      .getByRole("heading", { name: "Önce giriş yapmalısın" })
      .count(),
    0,
  )
  await guestContext.close()

  /**
   * @param {{
   *   campaignId: string
   *   campaignKind: "community" | "instant"
   *   chapterIds: string[]
   *   chapterNumbers: string[]
   *   qualityTier: "balanced" | "premium"
   *   outputLanguage: "tr"
   *   sourceEditionId: string
   *   sourceLabel: string
   *   sameSource: boolean
   *   sameSettings: boolean
   *   targetCredits: number
   *   fundedCredits: number
   *   remainingCredits: number
   * }} conflict
   */
  const openConflictFlow = async (conflict) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    })
    await context.addCookies([
      {
        name: "novora-debug-viewer",
        value: "USER",
        url: baseUrl,
      },
    ])
    const page = await context.newPage()
    await page.goto(
      `${baseUrl}/translate?q=${encodeURIComponent("Tower of God")}`,
      { waitUntil: "networkidle" },
    )
    const selectionResponse = page.waitForResponse(
      (candidate) =>
        candidate.url().endsWith("/api/translation/catalog") &&
        candidate.request().method() === "POST",
    )
    await page
      .getByRole("link")
      .filter({
        has: page.getByRole("heading", {
          name: "Tower of God",
          exact: true,
        }),
      })
      .click()
    assert.equal((await selectionResponse).status(), 200)
    assert.equal(new URL(page.url()).pathname, "/translate")
    await page.getByRole("heading", { name: "AI çeviri seçimi" }).waitFor()
    await page.getByRole("button", { name: "Tek bölüm" }).click()
    await page.route("**/api/translation/quote", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          quote: {
            qualityTier: "balanced",
            outputLanguage: "tr",
            perChapterCredits: 100,
            totalCredits: 100,
            fundedCredits: 0,
            remainingCredits: 100,
            lines: [],
          },
          existingTranslations: [],
          conflictingRequests: [conflict],
        }),
        status: 200,
      })
    })
    await page.getByRole("button", { name: /Dengeli AI/ }).click()
    await page.getByRole("button", { name: /Bu Bölümü Şimdi Çevir/ }).click()
    return { context, page }
  }

  const sameFlow = await openConflictFlow({
    campaignId: "same-settings",
    campaignKind: "community",
    chapterIds: ["same-chapter"],
    chapterNumbers: ["4"],
    qualityTier: "balanced",
    outputLanguage: "tr",
    sourceEditionId: "same-edition",
    sourceLabel: "İngilizce-1",
    sameSource: true,
    sameSettings: true,
    targetCredits: 100,
    fundedCredits: 40,
    remainingCredits: 60,
  })
  await sameFlow.page
    .getByRole("heading", { name: "Bu bölüm toplu bir talebe dahil" })
    .waitFor()
  await sameFlow.page
    .getByRole("dialog")
    .getByText("100 kredi", { exact: true })
    .waitFor()
  await sameFlow.page
    .getByRole("button", { name: "Toplu Desteğe Katıl" })
    .waitFor()
  await sameFlow.page
    .getByRole("button", { name: "Bu Bölümü Şimdi Çevir", exact: true })
    .waitFor()
  await sameFlow.context.close()

  const differentFlow = await openConflictFlow({
    campaignId: "different-settings",
    campaignKind: "community",
    chapterIds: ["different-chapter"],
    chapterNumbers: ["4"],
    qualityTier: "premium",
    outputLanguage: "tr",
    sourceEditionId: "different-edition",
    sourceLabel: "Korece-1",
    sameSource: false,
    sameSettings: false,
    targetCredits: 150,
    fundedCredits: 70,
    remainingCredits: 80,
  })
  await differentFlow.page
    .getByRole("heading", { name: "Bu bölüm toplu bir talebe dahil" })
    .waitFor()
  await differentFlow.page.getByText("Mevcut talep", { exact: true }).waitFor()
  await differentFlow.page.getByText("Senin seçimin", { exact: true }).waitFor()
  await differentFlow.page
    .getByRole("button", {
      name: "Toplu Desteğe Katıl",
    })
    .waitFor()
  await differentFlow.page
    .getByRole("button", {
      name: "Bu Bölümü Şimdi Çevir",
      exact: true,
    })
    .waitFor()
  await differentFlow.context.close()

  const campaignsContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  })
  await campaignsContext.addCookies([
    {
      name: "novora-debug-viewer",
      value: "USER",
      url: baseUrl,
    },
  ])
  const campaignsPage = await campaignsContext.newPage()
  const campaignFixture = {
    qualityTier: "balanced",
    translationType: "ai",
    outputLanguage: "tr",
    targetCredits: 100,
    fundedCredits: 100,
    chapterIds: ["chapter"],
    chapterNumbers: ["1"],
    chapterProgressStatuses: ["QUEUED"],
    remainingChapterCount: 1,
    completedExternallyCount: 0,
    ownCredits: 20,
    coverUrl: "/api/translation/catalog/example/cover",
    catalogSeriesId: "series",
    sourceEditionId: "edition",
    sourceLabel: "İngilizce-1",
    updatedAt: new Date().toISOString(),
  }
  await campaignsPage.route("**/api/translation/campaigns", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue()
      return
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        authenticated: true,
        balance: 50,
        campaigns: [
          {
            id: "multi-chapter-campaign",
            status: "FUNDING",
            qualityTier: "balanced",
            translationType: "ai",
            outputLanguage: "tr",
            targetCredits: 600,
            fundedCredits: 80,
            chapterIds: ["c1", "c2", "c3", "c4", "c5", "c6"],
            chapterNumbers: ["1", "2", "3", "4", "5", "6"],
            chapterProgressStatuses: [
              "FUNDING",
              "FUNDING",
              "FUNDING",
              "FUNDING",
              "FUNDING",
              "FUNDING",
            ],
            remainingChapterCount: 6,
            completedExternallyCount: 0,
            ownCredits: 20,
            seriesTitle: "Tower of God",
            coverUrl: "/api/translation/catalog/example/cover",
            catalogSeriesId: "series",
            sourceEditionId: "edition",
            sourceLabel: "İngilizce-1",
            updatedAt: new Date().toISOString(),
          },
          {
            ...campaignFixture,
            id: "single-chapter-campaign",
            status: "FUNDING",
            fundedCredits: 30,
            remainingChapterCount: 1,
            seriesTitle: "Tek Bölüm Talebi",
          },
          {
            ...campaignFixture,
            id: "queued-campaign",
            status: "QUEUED",
            seriesTitle: "Sıradaki Seri",
          },
          {
            ...campaignFixture,
            id: "processing-campaign",
            status: "PROCESSING",
            chapterProgressStatuses: ["PROCESSING"],
            seriesTitle: "Çevrilen Seri",
          },
          {
            ...campaignFixture,
            id: "completed-campaign",
            status: "COMPLETED",
            chapterProgressStatuses: ["COMPLETED"],
            remainingChapterCount: 0,
            seriesSlug: "yayindaki-seri",
            seriesTitle: "Yayındaki Seri",
          },
          {
            ...campaignFixture,
            id: "refunded-campaign",
            status: "REFUNDED",
            chapterProgressStatuses: ["REFUNDED"],
            fundedCredits: 0,
            seriesTitle: "İade Serisi",
          },
          {
            ...campaignFixture,
            id: "failed-campaign",
            status: "FAILED",
            chapterProgressStatuses: ["FAILED"],
            seriesTitle: "Başarısız Seri",
          },
        ],
      }),
      status: 200,
    })
  })
  await campaignsPage.route("**/api/translation/batches", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ authenticated: true, batches: [] }),
      status: 200,
    })
  })
  await campaignsPage.goto(`${baseUrl}/translate/serilerim`, {
    waitUntil: "networkidle",
  })
  await campaignsPage
    .getByRole("heading", { name: "Tower of God", exact: true })
    .waitFor()
  const multiCampaignCard = campaignsPage
    .getByRole("article")
    .filter({
      has: campaignsPage.getByRole("heading", {
        name: "Tower of God",
        exact: true,
      }),
    })
    .first()
  await multiCampaignCard
    .getByRole("button", { name: "6 bölümün durumunu görüntüle" })
    .click()
  const chapterDetails = multiCampaignCard.locator("details")
  assert.equal(await chapterDetails.getByRole("article").count(), 6)
  assert.equal(
    await chapterDetails
      .getByText("Destek Toplanıyor", { exact: true })
      .count(),
    6,
  )
  assert.equal(await campaignsPage.getByText(/Çeviri özeti:/).count(), 0)
  await multiCampaignCard.getByRole("button", { name: "Destek Ol" }).click()
  await campaignsPage
    .getByRole("heading", { name: "Çeviri talebine destek ol" })
    .waitFor()
  await campaignsPage
    .getByText(/Tower of God/)
    .last()
    .waitFor()
  await campaignsPage.getByText("10 kredi", { exact: true }).waitFor()
  await campaignsPage.getByText("30 kredi", { exact: true }).waitFor()
  await campaignsPage.screenshot({
    path: `${artifactDir}/contribution-dialog-mobile.png`,
  })
  await campaignsPage
    .getByRole("button", { name: "Katkı penceresini kapat" })
    .click()
  await campaignsPage.screenshot({
    fullPage: true,
    path: `${artifactDir}/campaign-cards-mobile.png`,
  })

  const expectedCampaignStates = [
    {
      title: "Tek Bölüm Talebi",
      state: "Destek Toplanıyor",
      action: "Destek Ol",
    },
    { title: "Sıradaki Seri", state: "Sırada", action: "Detayları Gör" },
    {
      title: "Çevrilen Seri",
      state: "Çevriliyor",
      action: "İlerlemeyi Gör",
    },
    { title: "Yayındaki Seri", state: "Yayında", action: "Bölümü Oku" },
    {
      title: "İade Serisi",
      state: "İade Edildi",
      action: "İade Detayını Gör",
    },
    {
      title: "Başarısız Seri",
      state: "Başarısız",
      action: "Durumu Gör",
    },
  ]
  for (const { action, state, title } of expectedCampaignStates) {
    const card = campaignsPage
      .getByRole("article")
      .filter({
        has: campaignsPage.getByRole("heading", { name: title, exact: true }),
      })
      .first()
    await card.locator("[data-campaign-status]").getByText(state).waitFor()
    await card.getByText(action, { exact: true }).waitFor()
  }
  await campaignsContext.close()
} finally {
  await browser.close()
}
