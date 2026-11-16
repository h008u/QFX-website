import { dismissConsent, expect, test } from "./fixtures";

const PAGES = [
  "/",
  "/markets",
  "/markets/xauusd",
  "/signals",
  "/feed",
  "/performance",
  "/how-it-works",
  "/blog",
  "/login",
  "/privacy",
  "/terms",
  "/cookies",
  "/risk",
];

for (const path of PAGES) {
  test(`page ${path} renders in Arabic RTL with a heading`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page).toHaveTitle(/QFX/);
  });
}

test("unknown page returns 404", async ({ page }) => {
  const res = await page.goto("/this-page-does-not-exist");
  expect(res?.status()).toBe(404);
});

test("consent choice hides the banner and survives a reload", async ({ page }) => {
  await page.goto("/");
  const banner = page.getByRole("region", { name: "موافقة الكوكيز" });
  await expect(banner).toBeVisible();
  await page.getByRole("button", { name: "الضرورية فقط" }).click();
  await expect(banner).toBeHidden();
  await page.reload();
  await expect(page.locator("h1").first()).toBeVisible();
  await expect(banner).toBeHidden();
});

test("lead form validates input and reports demo mode", async ({ page }) => {
  await page.goto("/");
  await dismissConsent(page);
  const form = page.locator("form").filter({ has: page.locator("#full_name") });
  await form.scrollIntoViewIfNeeded();
  await form.locator("#full_name").fill("مختبر آلي");
  await form.getByRole("button", { name: "أرسل طلب الانضمام" }).click();
  await expect(form.getByText("أضف وسيلة تواصل واحدة على الأقل")).toBeVisible();

  // React يفرّغ حقول النموذج بعد كل إرسال، لذا نعيد تعبئة الاسم
  await form.locator("#full_name").fill("مختبر آلي");
  await form.locator("#telegram").fill("@qfx_e2e");
  await form.getByRole("button", { name: "أرسل طلب الانضمام" }).click();
  // بدون Supabase لا يُحفظ شيء — الرسالة توضّح ذلك بدل الادعاء بالنجاح
  await expect(form.getByText(/وضع تجريبي/)).toBeVisible();
});

test("market page draws a chart", async ({ page }) => {
  await page.goto("/markets/xauusd");
  await dismissConsent(page);
  await expect(page.locator("canvas").first()).toBeVisible();
});

test("theme preview via ?theme= applies to the page", async ({ page }) => {
  await page.goto("/?theme=neon");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "neon");
  await page.goto("/?theme=reset");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", "neon");
});

test("SEO endpoints respond", async ({ request }) => {
  for (const path of ["/robots.txt", "/sitemap.xml", "/llms.txt", "/api/health/seo"]) {
    const res = await request.get(path);
    expect(res.status(), path).toBe(200);
  }
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/markets/");
});

test("app manifest and offline page are served", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.status()).toBe(200);
  const m = await res.json();
  expect(m.display).toBe("standalone");
  expect(m.icons.map((i: { sizes: string }) => i.sizes)).toEqual(expect.arrayContaining(["192x192", "512x512"]));
  expect((await request.get("/offline.html")).status()).toBe(200);
  expect((await request.get("/icon-512.png")).status()).toBe(200);
});

test("quotes API returns a well-formed list", async ({ request }) => {
  const res = await request.get("/api/quotes");
  expect(res.status()).toBe(200);
  const { quotes } = await res.json();
  expect(Array.isArray(quotes)).toBe(true);
  for (const q of quotes) {
    expect(typeof q.symbol).toBe("string");
    expect(q.last).toBeGreaterThan(0);
  }
});
