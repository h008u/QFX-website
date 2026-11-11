import {
  checkRules, decidePolicy, findDuplicate, fingerprint, inQuietHours, quietEndsAt,
  type BotSettings, type PolicyKind, type PostKind,
} from "@qfx/shared";
import { db } from "../supabase";
import { notifyAdmins } from "./approvals";
import { publishPost } from "./publish";
import type { PostRow } from "./types";

export interface Candidate {
  kind: PostKind;
  title?: string | null;
  body: string;
  format?: "markup" | "html";
  photo_url?: string | null;
  source?: string | null;
  source_url?: string | null;
  external_id?: string | null;
  categories?: string[];
  score?: number;
  policy?: PolicyKind | null; // null = ينشر مباشرة (التحيات وما شابه)
  dedupe?: boolean;
  breaking?: boolean;
  disclaimer?: boolean;
  /** لا يطبّق قواعد الكلمات (للمحتوى المولّد داخلياً) */
  skipRules?: boolean;
}

export type IntakeResult = { outcome: "exists" } | { outcome: PostRow["status"]; post: PostRow };

const DEDUPE_WINDOW_H = 12;

/**
 * مسار كل محتوى آلي: الكلمات الممنوعة/المطلوبة ← كشف المكرر ← سياسة النشر ← الإيقاف المؤقت/ساعات الهدوء ← النشر أو الموافقة.
 * كل عنصر يُحفظ في posts مع حالته وسببه (سجل التدفق).
 */
export async function intake(c: Candidate, s: BotSettings, now = new Date()): Promise<IntakeResult> {
  if (c.external_id) {
    const { data } = await db().from("posts").select("id").eq("external_id", c.external_id).maybeSingle();
    if (data) return { outcome: "exists" };
  }

  const text = `${c.title ?? ""}\n${c.body}`;
  const score = c.score ?? 50;
  let status: PostRow["status"] = "pending";
  let reason: string | null = null;
  let scheduled_at: string | null = null;
  const fp = c.dedupe ? fingerprint(c.title || c.body.slice(0, 200)) : null;

  const rules = c.skipRules ? { banned: null, missingRequired: false, watched: [] as string[] } : checkRules(text, s.rules);

  if (rules.banned) {
    status = "filtered";
    reason = `كلمة ممنوعة: ${rules.banned}`;
  } else if (rules.missingRequired) {
    status = "filtered";
    reason = "لا يحتوي أياً من الكلمات المطلوبة";
  }

  if (status !== "filtered" && fp) {
    const since = new Date(now.getTime() - DEDUPE_WINDOW_H * 3600_000).toISOString();
    const { data: recent } = await db()
      .from("posts")
      .select("id, title, fingerprint, source")
      .gte("created_at", since)
      .not("fingerprint", "is", null)
      .in("status", ["published", "partial", "pending", "scheduled", "publishing"])
      .limit(300);
    const dup = findDuplicate(fp, (recent ?? []) as { id: string; title: string; fingerprint: typeof fp; source: string }[]);
    if (dup) {
      status = "duplicate";
      reason = `مكرر من ${dup.source ?? "مصدر آخر"}: ${dup.title ?? ""}`.slice(0, 300);
    }
  }

  if (status === "pending") {
    const decision = c.policy ? decidePolicy(s.policy[c.policy], score) : "auto";
    if (decision === "blocked") {
      status = "filtered";
      reason = `تقييم منخفض (${score})`;
    } else if (decision === "pending") {
      status = "pending";
      reason = s.policy[c.policy!].mode === "approval" ? "بانتظار موافقتك" : `تقييم متوسط (${score})`;
    } else if (s.general.paused) {
      status = "pending";
      reason = "النشر التلقائي متوقف مؤقتاً";
    } else if (
      s.rules.quiet.enabled &&
      !(c.breaking && s.rules.quiet.allowBreaking) &&
      inQuietHours(now, s.general.timezone, s.rules.quiet.start, s.rules.quiet.end)
    ) {
      status = "scheduled";
      reason = "ساعات الهدوء";
      scheduled_at = quietEndsAt(now, s.general.timezone, s.rules.quiet.end).toISOString();
    } else {
      status = "publishing";
    }
  }

  const row = {
    kind: c.kind,
    status: status === "publishing" ? "scheduled" : status,
    title: c.title ?? null,
    body: c.body.slice(0, 4000),
    format: c.format ?? "markup",
    photo_url: c.photo_url ?? null,
    source: c.source ?? null,
    source_url: c.source_url ?? null,
    external_id: c.external_id ?? null,
    fingerprint: fp,
    categories: c.categories ?? [],
    score,
    reason,
    disclaimer: c.disclaimer ?? false,
    scheduled_at: status === "publishing" ? now.toISOString() : scheduled_at,
  };
  const { data: inserted, error } = await db().from("posts").insert(row).select().single<PostRow>();
  if (error) {
    if (error.code === "23505") return { outcome: "exists" }; // سبقنا تشغيل آخر لنفس العنصر
    throw error;
  }

  let post = inserted;
  if (status === "publishing") {
    post = await publishPost(post.id);
  } else if (status === "pending") {
    await notifyAdmins(post, "📝 <b>منشور ينتظر موافقتك</b>");
  }
  if (rules.watched.length && status !== "pending") {
    await notifyAdmins(post, `👁 <b>كلمة مراقبة:</b> ${rules.watched.join("، ")}`);
  }
  return { outcome: post.status, post };
}
