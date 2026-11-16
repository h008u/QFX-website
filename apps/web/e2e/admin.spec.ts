import { expect, test } from "./fixtures";

// بدون Supabase تعمل لوحة الإدارة في «وضع المعاينة» ببيانات توضيحية
const ADMIN_PAGES: [string, RegExp][] = [
  ["/admin", /نظرة عامة/],
  ["/admin/signals", /التوصيات/],
  ["/admin/settings", /الإعدادات/],
  ["/admin/site", /محتوى الموقع/],
  ["/admin/compose", /منشور/],
  ["/admin/calendar", /تقويم/],
  ["/admin/mt5", /MT5/],
  ["/admin/system", /صحة النظام/],
];

for (const [path, title] of ADMIN_PAGES) {
  test(`admin ${path} renders in preview mode`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1").first()).toHaveText(title);
  });
}

test("command palette opens with Ctrl+K and navigates", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.locator("h1").first()).toBeVisible();
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: "بحث سريع" });
  await expect(dialog).toBeVisible();
  await dialog.getByPlaceholder("اكتب اسم صفحة أو إجراء...").fill("صحة النظام");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/admin\/system/);
});

test("live page editor shows its toolbar in preview mode", async ({ page }) => {
  await page.goto("/?edit=1");
  await expect(page.getByRole("button", { name: "حفظ ونشر" })).toBeVisible();
});
