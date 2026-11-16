import { NextResponse } from "next/server";
import { getQuotes } from "@/lib/market-data";

// آخر الأسعار لكل الأسواق — تستدعيه الصفحات المفتوحة كل 30 ثانية لتحديث الأسعار دون إعادة تحميل.
// الأسعار نفسها مخزّنة على الخادم 30 ثانية، فعدد الطلبات للمصادر ثابت مهما كثر الزوار.
export const revalidate = 30;

export async function GET() {
  const quotes = await getQuotes();
  return NextResponse.json(
    { quotes, at: new Date().toISOString() },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } },
  );
}
