import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, JetBrains_Mono } from "next/font/google";
import { siteConfig } from "@/config/site";
import { THEME_INIT_SCRIPT } from "@/lib/theme-script";
import "./globals.css";

// الحروف العربية فقط من Plex؛ اللاتينية والأرقام تسقط لخطوط النظام (مكدس TradingView)
const font = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

// خط أحادي المسافة للأسعار حتى لا تهتز الأرقام عند التحديث اللحظي
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: siteConfig.title, template: `%s | ${siteConfig.name}` },
  description: siteConfig.description,
  openGraph: { title: siteConfig.title, description: siteConfig.description, locale: "ar_AR", type: "website" },
};

export const viewport: Viewport = { themeColor: "#FFFFFF", viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${font.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
