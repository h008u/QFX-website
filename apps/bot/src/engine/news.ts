import { NEWS_CATEGORIES, categorize, categoryTags, scoreNews, type BotSettings } from "@qfx/shared";
import { db } from "../supabase";
import { getState, setState } from "./config";
import { isArabic, translate } from "./fetch";
import { intake } from "./intake";
import { allSources, fetchSource, sourceOn, type NewsItem, type NewsSource } from "./sources";

const MAX_AGE_H = 24;

export interface SourceReport {
  id: string;
  label: string;
  ok: boolean;
  count: number;
  error?: string;
  ms: number;
}

/** يفحص كل المصادر ويرجع الحالة (مثل /sources في Spir) */
export async function checkSources(s: BotSettings): Promise<SourceReport[]> {
  return Promise.all(
    allSources(s.news.custom_feeds).map(async (src) => {
      const t = Date.now();
      try {
        const items = await fetchSource(src);
        return { id: src.id, label: src.label, ok: true, count: items.length, ms: Date.now() - t };
      } catch (e) {
        return { id: src.id, label: src.label, ok: false, count: 0, error: e instanceof Error ? e.message : String(e), ms: Date.now() - t };
      }
    }),
  );
}

const categoryOn = (s: BotSettings, id: string) =>
  s.news.categories[id] ?? NEWS_CATEGORIES.find((c) => c.id === id)?.on ?? false;

function buildBody(item: NewsItem, title: string, summary: string, src: NewsSource, cats: string[], s: BotSettings) {
  const lines = [`📰 **${title}**`];
  if (summary && summary !== title) lines.push("", summary.length > 400 ? `${summary.slice(0, 400)}…` : summary);
  const meta: string[] = [];
  if (s.news.show_tags) meta.push(...categoryTags(cats));
  if (meta.length) lines.push("", meta.join(" "));
  if (s.news.show_source) lines.push(item.link ? `المصدر: [${src.label}](${item.link})` : `المصدر: ${src.label}`);
  return lines.join("\n");
}

/**
 * مهمة الأخبار: يجلب المصادر المفعّلة، يصنّف ويقيّم ويترجم، ثم يمرر كل خبر جديد على مسار intake.
 * أول تشغيل لكل مصدر يسجّل الأخبار الموجودة بدون نشر حتى لا تنغرق القناة.
 */
export async function runNews(s: BotSettings, now = new Date()) {
  const sources = allSources(s.news.custom_feeds).filter((src) => sourceOn(src, s.news.sources));
  const seeded = await getState<Record<string, boolean>>("news_seeded", {});
  const report: Record<string, { ok: boolean; count: number; error?: string }> = {};
  const fresh: { item: NewsItem; src: NewsSource }[] = [];

  await Promise.all(
    sources.map(async (src) => {
      try {
        const items = await fetchSource(src);
        report[src.id] = { ok: true, count: items.length };
        for (const item of items) {
          if (item.date && now.getTime() - item.date.getTime() > MAX_AGE_H * 3600_000) continue;
          fresh.push({ item, src });
        }
      } catch (e) {
        report[src.id] = { ok: false, count: 0, error: e instanceof Error ? e.message : String(e) };
      }
    }),
  );

  // استبعاد الموجود مسبقاً
  const ids = fresh.map(({ item, src }) => `news:${src.id}:${item.key}`.slice(0, 500));
  const existing = new Set<string>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await db().from("posts").select("external_id").in("external_id", ids.slice(i, i + 200));
    data?.forEach((r) => existing.add(r.external_id as string));
  }
  const candidates = fresh
    .map((f, i) => ({ ...f, external_id: ids[i] }))
    .filter((f) => !existing.has(f.external_id))
    .sort((a, b) => (b.item.date?.getTime() ?? 0) - (a.item.date?.getTime() ?? 0));

  // أول تشغيل للمصدر: نسجّل بدون نشر
  const seedRows = candidates.filter((c) => !seeded[c.src.id]);
  if (seedRows.length) {
    await db()
      .from("posts")
      .upsert(
        seedRows.map((c) => ({
          kind: "news",
          status: "filtered",
          reason: "أول تشغيل للمصدر (سُجّل بدون نشر)",
          title: c.item.title,
          body: c.item.title,
          source: c.src.label,
          source_url: c.item.link,
          external_id: c.external_id,
          categories: categorize(`${c.item.title} ${c.item.summary}`),
        })),
        { onConflict: "external_id", ignoreDuplicates: true },
      );
  }
  for (const src of sources) if (report[src.id]?.ok) seeded[src.id] = true;
  await setState("news_seeded", seeded);

  const toProcess = candidates.filter((c) => !seedRows.includes(c)).slice(0, s.news.max_per_run);
  const outcomes: Record<string, number> = {};
  for (const c of toProcess) {
    const raw = `${c.item.title} ${c.item.summary}`;
    const cats = categorize(raw);
    const enabled = cats.filter((id) => categoryOn(s, id));
    const translateIt = s.news.translate && !isArabic(c.item.title);
    const title = translateIt ? await translate(c.item.title) : c.item.title;
    const summary = translateIt && c.item.summary ? await translate(c.item.summary) : c.item.summary;
    const sc = scoreNews(`${raw} ${title}`, s.news.focus);
    const base = {
      kind: "news" as const,
      title,
      body: buildBody(c.item, title, summary, c.src, enabled.length ? enabled : cats, s),
      photo_url: c.item.image,
      source: c.src.label,
      source_url: c.item.link,
      external_id: c.external_id,
      categories: cats,
      score: sc.score,
      policy: "news" as const,
      dedupe: true,
      breaking: sc.drivers.includes("breaking"),
    };
    if (!enabled.length) {
      // خارج الأنواع المختارة: يُحفظ كمفلتر (يظهر بسجل التدفق ويمكن نشره يدوياً)
      const { policy: _p, dedupe: _d, breaking: _b, ...row } = base;
      await db().from("posts").insert({ ...row, status: "filtered", reason: cats.length ? "النوع مطفي" : "خارج الأنواع المختارة" });
      outcomes.filtered = (outcomes.filtered ?? 0) + 1;
      continue;
    }
    const r = await intake(base, s, now);
    outcomes[r.outcome] = (outcomes[r.outcome] ?? 0) + 1;
  }

  return { sources: report, seeded: seedRows.length, processed: toProcess.length, outcomes };
}
