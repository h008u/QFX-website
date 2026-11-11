import "server-only";
import webpush from "web-push";
import { getServiceClient } from "@/lib/supabase/server";

/** إشعار متصفح لكل أجهزة الفريق (من الموقع: طلب انضمام جديد...) */
export async function pushToStaff(title: string, body: string, url = "/admin") {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const sb = getServiceClient();
  if (!pub || !priv || !sb) return 0;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", pub, priv);
  const { data } = await sb.from("push_subscriptions").select("id, endpoint, p256dh, auth").limit(200);
  let sent = 0;
  await Promise.all(
    (data ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ title, body, url }), { TTL: 3600 });
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await sb.from("push_subscriptions").delete().eq("id", s.id);
      }
    }),
  );
  return sent;
}
