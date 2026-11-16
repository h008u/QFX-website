import { test as base, expect, type Page } from "@playwright/test";

/** يفشل الاختبار إذا ظهر خطأ JavaScript غير معالج في الصفحة */
export const test = base.extend<{ pageErrors: Error[] }>({
  pageErrors: [
    async ({ page }, use) => {
      const errors: Error[] = [];
      page.on("pageerror", (e) => errors.push(e));
      await use(errors);
      expect(errors.map((e) => e.message), "uncaught page errors").toEqual([]);
    },
    { auto: true },
  ],
});

/** يغلق شريط موافقة الكوكيز (يظهر لكل زائر جديد) */
export async function dismissConsent(page: Page) {
  // الشريط يظهر بعد تحميل الصفحة على المتصفح، فننتظره قليلاً بدل فحص لحظي
  const btn = page.getByRole("region", { name: "موافقة الكوكيز" }).getByRole("button", { name: "الضرورية فقط" });
  await btn.click({ timeout: 10_000 });
  await expect(btn).toBeHidden();
}

export { expect };
