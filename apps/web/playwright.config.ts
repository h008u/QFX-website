import { defineConfig, devices } from "@playwright/test";

// اختبارات الواجهة من البداية للنهاية. تعمل على نسخة مبنية (next build) في الوضع التجريبي
// بدون مفاتيح Supabase، لذا لا تحتاج قاعدة بيانات ولا تكتب أي بيانات حقيقية.
//   npm run build -w @qfx/web && npm run e2e -w @qfx/web
const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    locale: "ar",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /mobile\.spec\.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}/robots.txt`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    // الوضع التجريبي: نتأكد أن مفاتيح Supabase غير موجودة حتى لو كانت في بيئة المطوّر
    env: { NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_ANON_KEY: "", SUPABASE_SERVICE_ROLE_KEY: "" },
  },
});
