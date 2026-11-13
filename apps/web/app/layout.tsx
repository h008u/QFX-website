import type { Metadata, Viewport } from "next";
import { siteConfig } from "@/config/site";
import { getAppearance } from "@/lib/site-settings";
import { THEME_INIT_SCRIPT } from "@/lib/theme-script";
import "./fonts.css";
import "./globals.css";

// الخطوط مستضافة ذاتياً (app/fonts.css ← scripts/gen-fonts.mjs): لا اعتماد على Google أثناء البناء،
// والمتصفح يحمّل فقط ملفات الثيم الظاهر. نحمّل مسبقاً أهم ملفين أو ثلاثة لكل ثيم لتسريع أول عرض.
const PRELOAD: Record<string, string[]> = {
  institutional: ["ibm-plex-sans-arabic/ibm-plex-sans-arabic-arabic-400-normal", "ibm-plex-sans-arabic/ibm-plex-sans-arabic-arabic-700-normal", "noto-kufi-arabic/noto-kufi-arabic-arabic-800-normal"],
  classic: ["ibm-plex-sans-arabic/ibm-plex-sans-arabic-arabic-400-normal", "ibm-plex-sans-arabic/ibm-plex-sans-arabic-arabic-700-normal"],
  terminal: ["ibm-plex-sans-arabic/ibm-plex-sans-arabic-arabic-400-normal", "jetbrains-mono/jetbrains-mono-latin-500-normal"],
  neon: ["readex-pro/readex-pro-arabic-400-normal", "readex-pro/readex-pro-arabic-700-normal"],
  luxe: ["tajawal/tajawal-arabic-400-normal", "el-messiri/el-messiri-arabic-600-normal"],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: siteConfig.title, template: `%s | ${siteConfig.name}` },
  description: siteConfig.description,
  openGraph: { title: siteConfig.title, description: siteConfig.description, locale: "ar_AR", type: "website" },
};

export const viewport: Viewport = { viewportFit: "cover" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { theme } = await getAppearance();
  return (
    <html lang="ar" dir="rtl" data-theme={theme} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {(PRELOAD[theme] ?? []).map((f) => (
          <link key={f} rel="preload" href={`/fonts/${f}.woff2`} as="font" type="font/woff2" crossOrigin="anonymous" />
        ))}
      </head>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
