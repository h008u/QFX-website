import type { Metadata, Viewport } from "next";
import {
  Cormorant_Garamond, El_Messiri, IBM_Plex_Mono, IBM_Plex_Sans_Arabic, Inter, JetBrains_Mono, Noto_Kufi_Arabic, Readex_Pro, Space_Grotesk, Tajawal,
} from "next/font/google";
import { siteConfig } from "@/config/site";
import { getAppearance } from "@/lib/site-theme";
import { THEME_INIT_SCRIPT } from "@/lib/theme-script";
import "./globals.css";

// كل ثيم يستخدم مجموعة خطوط؛ المتصفح لا يحمّل إلا خطوط الثيم الظاهر فعلاً
const plex = IBM_Plex_Sans_Arabic({ subsets: ["arabic"], weight: ["400", "500", "600", "700"], variable: "--f-plex", display: "swap" });
const kufi = Noto_Kufi_Arabic({ subsets: ["arabic"], weight: ["600", "700", "800"], variable: "--f-kufi", display: "swap" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--f-plexmono", display: "swap" });
const jet = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--f-jet", display: "swap", preload: false });
const readex = Readex_Pro({ subsets: ["arabic", "latin"], weight: ["300", "400", "600", "700"], variable: "--f-readex", display: "swap", preload: false });
const grotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500", "700"], variable: "--f-grotesk", display: "swap", preload: false });
const messiri = El_Messiri({ subsets: ["arabic", "latin"], weight: ["500", "600", "700"], variable: "--f-messiri", display: "swap", preload: false });
const tajawal = Tajawal({ subsets: ["arabic", "latin"], weight: ["400", "500", "700"], variable: "--f-tajawal", display: "swap", preload: false });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--f-cormorant", display: "swap", preload: false });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--f-inter", display: "swap", preload: false });
const FONT_VARS = [plex, kufi, plexMono, jet, readex, grotesk, messiri, tajawal, cormorant, inter].map((f) => f.variable).join(" ");

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
    <html lang="ar" dir="rtl" data-theme={theme} className={FONT_VARS} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
