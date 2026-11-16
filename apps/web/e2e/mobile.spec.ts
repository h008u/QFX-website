import { dismissConsent, expect, test } from "./fixtures";

// كل صفحات الزائر على مقاس الجوال: لا شيء يخرج عن عرض الشاشة (لا تمرير أفقي)
const PAGES = [
  "/", "/markets", "/markets/xauusd", "/markets/xauusd?view=chart", "/signals", "/feed", "/performance",
  "/how-it-works", "/blog", "/login", "/account", "/privacy", "/terms", "/cookies", "/risk",
];

for (const path of PAGES) {
  test(`mobile ${path} has no horizontal overflow`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("main").first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, "page wider than the screen").toBeLessThanOrEqual(1);
  });
}

test("mobile cookie banner stays compact", async ({ page }) => {
  await page.goto("/");
  const banner = page.getByRole("region", { name: "موافقة الكوكيز" });
  await expect(banner).toBeVisible();
  const box = await banner.boundingBox();
  const vh = page.viewportSize()!.height;
  expect(box!.height, "banner covers too much of the screen").toBeLessThan(vh * 0.25);
});

test("mobile bottom navigation reaches the signals page", async ({ page }) => {
  await page.goto("/");
  await dismissConsent(page);
  const tabbar = page.getByRole("navigation", { name: "التنقل السفلي" });
  await expect(tabbar).toBeVisible();
  for (const label of ["استكشف", "الأسواق", "الشارت", "التوصيات", "القائمة"]) await expect(tabbar.getByText(label)).toBeVisible();
  await tabbar.getByRole("link", { name: "التوصيات" }).click();
  await expect(page).toHaveURL(/\/signals/);
  await expect(page.locator("h1").first()).toBeVisible();
});

test("mobile menu lists news and markets with a join button", async ({ page }) => {
  await page.goto("/");
  await dismissConsent(page);
  await page.getByRole("navigation", { name: "التنقل السفلي" }).getByRole("button", { name: "القائمة" }).click();
  const menu = page.getByRole("dialog", { name: "القائمة" });
  await expect(menu.getByRole("link", { name: "افتح حسابك عبر الوكالة" })).toBeVisible();
  await menu.getByRole("link", { name: "الأخبار والتحليلات" }).click();
  await expect(page).toHaveURL(/\/feed/);
});

test("mobile footer sections are collapsed and open on tap", async ({ page }) => {
  await page.goto("/how-it-works");
  await dismissConsent(page);
  const footer = page.locator("footer");
  const section = footer.locator("details").filter({ hasText: "المنصة" });
  await section.scrollIntoViewIfNeeded();
  await expect(section.getByRole("link", { name: "سجل الأداء" })).toBeHidden();
  await section.locator("summary").click();
  await expect(section.getByRole("link", { name: "سجل الأداء" })).toBeVisible();
  await expect(footer.getByText(/مخاطر عالية/)).toBeVisible(); // إفصاح المخاطر ظاهر دائماً
});

test("mobile hero shows the stats on the first screen", async ({ page }) => {
  await page.goto("/");
  const stats = page.locator("dl").first();
  const box = await stats.boundingBox();
  expect(box!.y + box!.height, "stats below the fold").toBeLessThanOrEqual(page.viewportSize()!.height);
});

test("mobile watchlist filters stay pinned while scrolling", async ({ page }) => {
  await page.goto("/markets");
  await dismissConsent(page);
  const chip = page.getByRole("button", { name: "العملات" }).last();
  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(300);
  const box = await chip.boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeLessThan(140);
});

test("open signal card copies its levels", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/signals");
  await dismissConsent(page);
  const btn = page.getByRole("button", { name: "نسخ المستويات" }).first();
  await btn.click();
  await expect(page.getByText("تم النسخ").first()).toBeVisible();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toMatch(/الدخول: .+\nوقف الخسارة: .+\nالهدف 1: /);
});
