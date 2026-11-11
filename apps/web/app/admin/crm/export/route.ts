import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin/session";

const esc = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  // منع حقن الصيغ في Excel
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export async function GET() {
  const ctx = await getAdminContext();
  if (!ctx) return new NextResponse("Forbidden", { status: 403 });
  const { data } = await ctx.db.from("leads").select("*").order("created_at", { ascending: false });
  const cols = ["created_at", "full_name", "telegram_username", "phone", "email", "broker_account_id", "status", "referral_source", "notes"];
  const csv = "﻿" + [cols.join(","), ...(data ?? []).map((r) => cols.map((c) => esc((r as Record<string, unknown>)[c])).join(","))].join("\n");
  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="qfx-leads-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
