import { ImageResponse } from "next/og";
import { fallbackCard, loadArabicFont, OG_HEADERS, RtlText } from "@/lib/og";

/** صورة مشاركة عامة: /api/og?title=...&subtitle=... (عنوان عربي باتجاه صحيح وخط عربي) */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = (searchParams.get("title") || "QFX").slice(0, 120);
  const subtitle = (searchParams.get("subtitle") || "").slice(0, 160);
  const fonts = await loadArabicFont(`${title} ${subtitle} وكيل معرّف توصيات تحليلات`, 700);
  if (!fonts.length) return fallbackCard();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          backgroundColor: "#0A1F44",
          backgroundImage: "radial-gradient(120% 120% at 0% 100%, rgba(184,145,47,0.35), rgba(10,31,68,0) 60%)",
          color: "#ffffff",
          fontFamily: "Plex",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <svg width="56" height="56" viewBox="0 0 34 34">
            <rect width="34" height="34" rx="9" fill="#ffffff" fillOpacity="0.1" />
            <path d="M8 22.5 L14 15.5 L18.5 19.5 L26 10.5" fill="none" stroke="#D4B25A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontSize: 44, fontWeight: 700 }}>QFX</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 20 }}>
          <RtlText text={title} maxChars={26} style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.25 }} />
          {subtitle && <RtlText text={subtitle} maxChars={48} style={{ fontSize: 30, color: "#C2CBDC", lineHeight: 1.5 }} />}
        </div>
        <div style={{ display: "flex", height: 6, width: "100%", backgroundColor: "#D4B25A", borderRadius: 3 }} />
      </div>
    ),
    { width: 1200, height: 630, fonts, headers: OG_HEADERS },
  );
}
