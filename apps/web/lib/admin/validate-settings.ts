import "server-only";
import { DEFAULT_SETTINGS, deepMerge, isValidTime, POLICY_KINDS, POST_KIND_LABEL, type BotSettings, type SettingsKey } from "@qfx/shared";

const clampInt = (v: unknown, min: number, max: number, d: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
};
const str = (v: unknown, max: number) => String(v ?? "").slice(0, max);
const words = (v: unknown) => (Array.isArray(v) ? v.map((w) => str(w, 80).trim()).filter(Boolean).slice(0, 200) : []);
const time = (v: unknown, d: string) => (isValidTime(String(v)) ? String(v) : d);
const day = (v: unknown, d: number) => clampInt(v, 0, 6, d);

/** ينظّف قسم الإعدادات قبل الحفظ؛ يرمي خطأً برسالة عربية عند قيمة غير مقبولة */
export function cleanSection<K extends SettingsKey>(key: K, raw: unknown): BotSettings[K] {
  const v = deepMerge(structuredClone(DEFAULT_SETTINGS[key]), raw) as BotSettings[K];
  switch (key) {
    case "general": {
      const g = v as BotSettings["general"];
      try {
        new Intl.DateTimeFormat("en", { timeZone: g.timezone });
      } catch {
        throw new Error("المنطقة الزمنية غير صحيحة");
      }
      return { timezone: g.timezone, paused: Boolean(g.paused), signature: str(g.signature, 300), disclaimer: str(g.disclaimer, 300) } as BotSettings[K];
    }
    case "destinations": {
      const list = (Array.isArray(raw) ? raw : []) as BotSettings["destinations"];
      if (list.length > 10) throw new Error("أقصى شيء 10 أماكن نشر");
      const kinds = Object.keys(POST_KIND_LABEL);
      return list.map((d, i) => {
        const chat = str(d.chat_id, 64).trim();
        if (!/^(@[A-Za-z0-9_]{5,32}|-?\d{5,20})$/.test(chat)) throw new Error(`معرّف المكان رقم ${i + 1} غير صحيح (اكتب @اسم_القناة أو الآيدي الرقمي)`);
        const thread = d.thread_id ? clampInt(d.thread_id, 1, 2 ** 31, 0) : null;
        return {
          id: /^[a-z0-9_-]{1,20}$/i.test(d.id) ? d.id : `d${i}_${Math.random().toString(36).slice(2, 7)}`,
          chat_id: chat,
          thread_id: thread || null,
          label: str(d.label, 60).trim() || chat,
          kinds: d.kinds === "all" ? "all" : (Array.isArray(d.kinds) ? d.kinds.filter((k) => kinds.includes(k)) : []),
          enabled: d.enabled !== false,
        };
      }) as BotSettings[K];
    }
    case "policy": {
      const p = v as BotSettings["policy"];
      for (const k of Object.keys(POLICY_KINDS) as (keyof typeof POLICY_KINDS)[]) {
        const r = p[k];
        if (!["auto", "approval", "score"].includes(r.mode)) r.mode = "auto";
        let a = clampInt(r.auto, 0, 100, 70);
        let b = clampInt(r.approve, 0, 100, 40);
        if (b > a) [a, b] = [b, a];
        p[k] = { mode: r.mode, auto: a, approve: b };
      }
      return p as BotSettings[K];
    }
    case "rules": {
      const r = v as BotSettings["rules"];
      return {
        banned: words(r.banned),
        required: words(r.required),
        watch: words(r.watch),
        quiet: { enabled: Boolean(r.quiet.enabled), start: time(r.quiet.start, "00:00"), end: time(r.quiet.end, "07:00"), allowBreaking: Boolean(r.quiet.allowBreaking) },
      } as BotSettings[K];
    }
    case "news": {
      const n = v as BotSettings["news"];
      return {
        ...n,
        enabled: Boolean(n.enabled),
        translate: Boolean(n.translate),
        interval_min: clampInt(n.interval_min, 5, 240, 10),
        max_per_run: clampInt(n.max_per_run, 1, 20, 4),
        custom_feeds: (n.custom_feeds ?? []).slice(0, 15).map((f, i) => {
          if (!/^https?:\/\/\S+$/.test(f.url)) throw new Error(`رابط المصدر "${f.label || i + 1}" غير صحيح`);
          return { id: /^[a-z0-9]{1,12}$/.test(f.id) ? f.id : Math.random().toString(36).slice(2, 8), label: str(f.label, 60) || f.url, url: f.url, on: Boolean(f.on) };
        }),
        focus: words(n.focus),
        show_tags: Boolean(n.show_tags),
        show_source: Boolean(n.show_source),
      } as BotSettings[K];
    }
    case "calendar": {
      const c = v as BotSettings["calendar"];
      return {
        currencies: words(c.currencies).map((x) => x.toUpperCase()).filter((x) => /^[A-Z]{3}$/.test(x)),
        min_impact: c.min_impact === "medium" ? "medium" : "high",
        agenda_enabled: Boolean(c.agenda_enabled),
        agenda_time: time(c.agenda_time, "08:00"),
        pre_alert_enabled: Boolean(c.pre_alert_enabled),
        pre_alert_min: clampInt(c.pre_alert_min, 5, 120, 15),
        explain: Boolean(c.explain),
      } as BotSettings[K];
    }
    case "greetings": {
      const g = v as BotSettings["greetings"];
      const caps = (t: "morning" | "open" | "close") => {
        const list = words(g.captions[t]).map((c) => c.slice(0, 1000));
        return list.length ? list : DEFAULT_SETTINGS.greetings.captions[t];
      };
      const imgs = (t: "morning" | "open" | "close") => (g.images[t] ?? []).filter((u) => /^(https:\/\/|\/demo\/)/.test(u)).slice(0, 30);
      return {
        morning: { enabled: Boolean(g.morning.enabled), time: time(g.morning.time, "07:00"), weekdays_only: Boolean(g.morning.weekdays_only) },
        open: { enabled: Boolean(g.open.enabled), day: day(g.open.day, 0), time: time(g.open.time, "23:30") },
        close: { enabled: Boolean(g.close.enabled), day: day(g.close.day, 5), time: time(g.close.time, "23:30") },
        captions: { morning: caps("morning"), open: caps("open"), close: caps("close") },
        images: { morning: imgs("morning"), open: imgs("open"), close: imgs("close") },
      } as BotSettings[K];
    }
    case "weekly": {
      const w = v as BotSettings["weekly"];
      return {
        enabled: Boolean(w.enabled),
        day: day(w.day, 5),
        time: time(w.time, "23:00"),
        poll: { enabled: Boolean(w.poll.enabled), symbol: str(w.poll.symbol, 12).toUpperCase().replace(/[^A-Z0-9]/g, "") || "XAUUSD", name: str(w.poll.name, 40) || "الذهب" },
      } as BotSettings[K];
    }
    case "templates": {
      const list = (Array.isArray(raw) ? raw : []) as BotSettings["templates"];
      if (list.length > 30) throw new Error("أقصى شيء 30 قالب");
      return list.map((t, i) => {
        const name = str(t.name, 40).trim();
        const body = str(t.body, 1500).trim();
        if (!name || !body) throw new Error(`القالب رقم ${i + 1}: الاسم والنص مطلوبان`);
        return { id: /^[\w-]{1,20}$/.test(t.id) ? t.id : Math.random().toString(36).slice(2, 10), name, body };
      }) as BotSettings[K];
    }
    case "holidays": {
      const list = (Array.isArray(raw) ? raw : []) as BotSettings["holidays"];
      return list
        .filter((h) => /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(h.date))
        .map((h) => ({ date: h.date, name: str(h.name, 40) || "عطلة" }))
        .slice(0, 40) as BotSettings[K];
    }
    case "tradingview":
      return { enabled: Boolean((v as BotSettings["tradingview"]).enabled) } as BotSettings[K];
  }
  return v;
}
