// إشعارات المتصفح (Web Push — مجانية): تصل لجوال/كمبيوتر الفريق حتى لو اللوحة مغلقة
import webpush from "web-push";
import { db } from "../supabase";

let configured: boolean | null = null;

function setup(): boolean {
  if (configured !== null) return configured;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  configured = Boolean(pub && priv);
  if (configured) webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", pub!, priv!);
  return configured;
}

const stripTags = (s: string) => s.replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

/** يرسل إشعاراً لكل أجهزة الفريق المشتركة؛ يحذف الاشتراكات المنتهية */
export async function pushToStaff(title: string, body: string, url = "/admin") {
  if (!setup()) return { sent: 0, skipped: "VAPID keys not set" };
  const { data } = await db().from("push_subscriptions").select("id, endpoint, p256dh, auth").limit(200);
  let sent = 0;
  const payload = JSON.stringify({ title: stripTags(title).slice(0, 120), body: stripTags(body).slice(0, 300), url });
  await Promise.all(
    (data ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600 });
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await db().from("push_subscriptions").delete().eq("id", s.id);
      }
    }),
  );
  return { sent };
}
