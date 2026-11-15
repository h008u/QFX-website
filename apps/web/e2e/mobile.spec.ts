import { dismissConsent, expect, test } from "./fixtures";

test("mobile home has no horizontal scroll", async ({ page }) => {
  await page.goto("/");
  await dismissConsent(page);
  await expect(page.locator("h1").first()).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("mobile bottom navigation reaches the feed page", async ({ page }) => {
  await page.goto("/");
  await dismissConsent(page);
  const tabbar = page.getByRole("navigation", { name: "التنقل السفلي" });
  await expect(tabbar).toBeVisible();
  await tabbar.getByRole("link", { name: "الأفكار" }).click();
  await expect(page).toHaveURL(/\/feed/);
  await expect(page.locator("h1").first()).toBeVisible();
});
