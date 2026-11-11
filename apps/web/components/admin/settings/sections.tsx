"use client";

import {
  CURRENCY_LABEL, DEFAULT_SETTINGS, MARKETS, NEWS_CATEGORIES, NEWS_SOURCE_META, POST_KIND_LABEL,
  type BotSettings, type Destination, type PostKind,
} from "@qfx/shared";
import { CheckCircle2, Plus, RefreshCw, Trash2, XCircle } from "lucide-react";
import { useState } from "react";
import { checkDestinationAction, checkSourcesAction, type DestinationCheck, type SourceCheck } from "@/app/admin/_actions/settings";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ListInput, Section, Switch } from "../ui";
import { DAYS, Field, inputCls, TestButton, useSection } from "./common";

const TIMEZONES = ["Asia/Riyadh", "Asia/Baghdad", "Asia/Dubai", "Asia/Kuwait", "Asia/Amman", "Africa/Cairo", "Africa/Casablanca", "Europe/Istanbul", "Europe/London", "UTC"];

export function GeneralSection({ initial, canEdit }: { initial: BotSettings["general"]; canEdit: boolean }) {
  const { value: v, setValue: set, bar } = useSection("general", initial);
  return (
    <Section id="general" title="⚙️ عام" description="المنطقة الزمنية لكل المواعيد، والتوقيع الذي ينزل بآخر كل منشور، والإيقاف المؤقت للنشر التلقائي.">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="المنطقة الزمنية">
          <select className={inputCls} value={v.timezone} disabled={!canEdit} onChange={(e) => set({ ...v, timezone: e.target.value })}>
            {[...new Set([v.timezone, ...TIMEZONES])].map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </Field>
        <div className="flex items-end">
          <Switch checked={v.paused} disabled={!canEdit} onChange={(paused) => set({ ...v, paused })} label="⏸ إيقاف النشر التلقائي مؤقتاً" description="المحتوى الجديد ينتظر موافقتك بدل النزول مباشرة (مفيد بالعطل)." />
        </div>
        <Field label="التوقيع" hint="مثال: 📈 **QFX** | [قناتنا](https://t.me/qfx) — اتركه فارغاً لإلغائه">
          <input className={inputCls} value={v.signature} disabled={!canEdit} onChange={(e) => set({ ...v, signature: e.target.value })} dir="auto" />
        </Field>
        <Field label="نص التحذير للمنشورات التحليلية">
          <input className={inputCls} value={v.disclaimer} disabled={!canEdit} onChange={(e) => set({ ...v, disclaimer: e.target.value })} />
        </Field>
      </div>
      {bar(canEdit)}
    </Section>
  );
}

const KINDS = Object.keys(POST_KIND_LABEL) as PostKind[];

function DestinationRow({ d, onChange, onRemove, canEdit }: { d: Destination; onChange: (d: Destination) => void; onRemove: () => void; canEdit: boolean }) {
  const [check, setCheck] = useState<DestinationCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const all = d.kinds === "all";
  const kinds = all ? KINDS : (d.kinds as PostKind[]);
  return (
    <div className={cn("rounded-lg border border-border p-4", !d.enabled && "opacity-60")}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_120px_auto]">
        <Field label="الاسم">
          <input className={inputCls} value={d.label} disabled={!canEdit} onChange={(e) => onChange({ ...d, label: e.target.value })} />
        </Field>
        <Field label="القناة أو المجموعة" hint="@channel أو -100…">
          <input className={inputCls} value={d.chat_id} disabled={!canEdit} onChange={(e) => onChange({ ...d, chat_id: e.target.value.trim() })} dir="ltr" />
        </Field>
        <Field label="موضوع (Topic)" hint="اختياري">
          <input className={inputCls} type="number" value={d.thread_id ?? ""} disabled={!canEdit} onChange={(e) => onChange({ ...d, thread_id: e.target.value ? Number(e.target.value) : null })} dir="ltr" />
        </Field>
        <div className="flex items-end gap-2 pb-0.5">
          <Switch checked={d.enabled} disabled={!canEdit} onChange={(enabled) => onChange({ ...d, enabled })} label="مفعّل" />
        </div>
      </div>
      <div className="mt-3">
        <p className="mb-1.5 text-xs text-muted-foreground">ما الذي ينزل هنا؟</p>
        <div className="flex flex-wrap gap-1.5">
          <button disabled={!canEdit} onClick={() => onChange({ ...d, kinds: all ? [] : "all" })} className={cn("rounded-full border px-2.5 py-1 text-xs", all ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground")}>
            الكل
          </button>
          {KINDS.map((k) => {
            const on = kinds.includes(k);
            return (
              <button
                key={k}
                disabled={!canEdit}
                onClick={() => onChange({ ...d, kinds: on ? KINDS.filter((x) => x !== k && kinds.includes(x)) : [...kinds, k] })}
                className={cn("rounded-full border px-2.5 py-1 text-xs", on ? "border-primary/50 bg-primary/10 text-foreground" : "border-border text-muted-foreground")}
              >
                {POST_KIND_LABEL[k]}
              </button>
            );
          })}
        </div>
      </div>
      {canEdit && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={checking || !d.chat_id}
            onClick={async () => {
              setChecking(true);
              setCheck(await checkDestinationAction(d.chat_id, d.thread_id ?? null));
              setChecking(false);
            }}
          >
            <RefreshCw className={cn("h-4 w-4", checking && "animate-spin")} /> فحص الصلاحيات
          </Button>
          <Button size="sm" variant="ghost" onClick={onRemove}>
            <Trash2 className="h-4 w-4" /> حذف
          </Button>
          {check && (
            <span className={cn("text-xs", check.ok ? "text-success" : "text-destructive")}>
              {check.ok ? `✅ جاهز — ${check.title} (${check.type})` : `⚠️ ${check.problems.join("، ")}`}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function DestinationsSection({ initial, canEdit }: { initial: Destination[]; canEdit: boolean }) {
  const { value, setValue, bar } = useSection("destinations", initial);
  return (
    <Section
      id="destinations"
      title="📍 أماكن النشر"
      description="قناة أو أكثر، ومجموعات، ومواضيع داخل المجموعات. لكل مكان تختار أنواع المحتوى التي تنزل فيه. إذا فشل مكان يكمل الباقي. اكتب /id داخل المجموعة أو الموضوع ليعطيك البوت المعرّف."
    >
      <div className="space-y-3">
        {value.map((d, i) => (
          <DestinationRow
            key={d.id}
            d={d}
            canEdit={canEdit}
            onChange={(nd) => setValue(value.map((x, j) => (j === i ? nd : x)))}
            onRemove={() => setValue(value.filter((_, j) => j !== i))}
          />
        ))}
        {!value.length && <p className="text-sm text-muted-foreground">لم تُضف أماكن بعد — البوت يستخدم TELEGRAM_CHANNEL_ID لكل الأنواع.</p>}
        {canEdit && value.length < 10 && (
          <Button size="sm" variant="outline" onClick={() => setValue([...value, { id: `d${Date.now().toString(36)}`, chat_id: "", label: "", kinds: "all", enabled: true }])}>
            <Plus className="h-4 w-4" /> إضافة مكان نشر
          </Button>
        )}
      </div>
      {bar(canEdit)}
    </Section>
  );
}

export function NewsSection({ initial, canEdit }: { initial: BotSettings["news"]; canEdit: boolean }) {
  const { value: v, setValue: set, bar } = useSection("news", initial);
  const [checks, setChecks] = useState<SourceCheck[] | null>(null);
  const [checkMsg, setCheckMsg] = useState("");
  const [checking, setChecking] = useState(false);
  const srcOn = (id: string, d: boolean) => v.sources[id] ?? d;
  const catOn = (id: string, d: boolean) => v.categories[id] ?? d;
  const checkOf = (id: string) => checks?.find((c) => c.id === id);

  return (
    <Section
      id="news"
      title="📰 الأخبار والمصادر"
      description="المصادر تُفحص كل دورة، والأخبار تمر على: الأنواع ← الكلمات ← كشف المكرر ← التقييم ← سياسة النشر."
      actions={canEdit && <TestButton what="news" label="جلب الآن" />}
    >
      <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
        <Switch checked={v.enabled} disabled={!canEdit} onChange={(enabled) => set({ ...v, enabled })} label="نشر الأخبار تلقائياً" />
        <Switch checked={v.translate} disabled={!canEdit} onChange={(translate) => set({ ...v, translate })} label="ترجمة الأخبار الإنجليزية للعربية" description="ترجمة Google المجانية" />
        <Switch checked={v.show_tags} disabled={!canEdit} onChange={(show_tags) => set({ ...v, show_tags })} label="إظهار وسوم النوع (#الذهب...)" />
        <Switch checked={v.show_source} disabled={!canEdit} onChange={(show_source) => set({ ...v, show_source })} label="إظهار اسم المصدر ورابطه" />
        <Field label="الفحص كل (دقيقة)">
          <input className={inputCls} type="number" min={5} value={v.interval_min} disabled={!canEdit} onChange={(e) => set({ ...v, interval_min: Number(e.target.value) })} dir="ltr" />
        </Field>
        <Field label="أقصى عدد أخبار بالدورة">
          <input className={inputCls} type="number" min={1} max={20} value={v.max_per_run} disabled={!canEdit} onChange={(e) => set({ ...v, max_per_run: Number(e.target.value) })} dir="ltr" />
        </Field>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold">المصادر</p>
          {canEdit && (
            <Button
              size="sm"
              variant="outline"
              disabled={checking}
              onClick={async () => {
                setChecking(true);
                const r = await checkSourcesAction();
                setChecks(r.sources);
                setCheckMsg(r.message ?? "");
                setChecking(false);
              }}
            >
              <RefreshCw className={cn("h-4 w-4", checking && "animate-spin")} /> فحص المصادر من السيرفر
            </Button>
          )}
        </div>
        {checkMsg && <p className="mb-2 text-xs text-gold">{checkMsg}</p>}
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {NEWS_SOURCE_META.map((src) => {
            const c = checkOf(src.id);
            return (
              <div key={src.id} className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{src.label}</p>
                  {"note" in src && <p className="text-[11px] text-muted-foreground">{src.note}</p>}
                  {c && (
                    <p className={cn("flex items-center gap-1 text-[11px]", c.ok ? "text-success" : "text-destructive")}>
                      {c.ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {c.ok ? `${c.count} خبر • ${c.ms}ms` : c.error}
                    </p>
                  )}
                </div>
                <Switch checked={srcOn(src.id, src.on)} disabled={!canEdit} onChange={(on) => set({ ...v, sources: { ...v.sources, [src.id]: on } })} />
              </div>
            );
          })}
        </div>
        <p className="mb-2 mt-4 text-sm font-semibold">مصادر RSS إضافية</p>
        <div className="space-y-2">
          {v.custom_feeds.map((f, i) => (
            <div key={f.id} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_2fr_auto_auto]">
              <input className={inputCls} placeholder="الاسم" value={f.label} disabled={!canEdit} onChange={(e) => set({ ...v, custom_feeds: v.custom_feeds.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
              <input className={inputCls} placeholder="https://.../rss" value={f.url} disabled={!canEdit} dir="ltr" onChange={(e) => set({ ...v, custom_feeds: v.custom_feeds.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })} />
              <Switch checked={f.on} disabled={!canEdit} onChange={(on) => set({ ...v, custom_feeds: v.custom_feeds.map((x, j) => (j === i ? { ...x, on } : x)) })} />
              {canEdit && (
                <Button size="sm" variant="ghost" onClick={() => set({ ...v, custom_feeds: v.custom_feeds.filter((_, j) => j !== i) })} aria-label="حذف">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => set({ ...v, custom_feeds: [...v.custom_feeds, { id: Date.now().toString(36), label: "", url: "", on: true }] })}>
              <Plus className="h-4 w-4" /> إضافة مصدر RSS
            </Button>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-semibold">أنواع الأخبار المنشورة</p>
          <div className="space-y-2">
            {NEWS_CATEGORIES.map((c) => (
              <Switch key={c.id} checked={catOn(c.id, c.on)} disabled={!canEdit} onChange={(on) => set({ ...v, categories: { ...v.categories, [c.id]: on } })} label={c.label} />
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1 text-sm font-semibold">أسواق التركيز (ترفع تقييم الخبر)</p>
          <p className="mb-2 text-xs text-muted-foreground">الخبر الذي يخص هذه الأسواق يحصل على +30 في التقييم.</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(MARKETS).map(([id, m]) => {
              const on = v.focus.includes(id);
              return (
                <button key={id} disabled={!canEdit} onClick={() => set({ ...v, focus: on ? v.focus.filter((x) => x !== id) : [...v.focus, id] })} className={cn("rounded-full border px-3 py-1.5 text-sm", on ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground")}>
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {bar(canEdit)}
    </Section>
  );
}

export function CalendarSection({ initial, canEdit }: { initial: BotSettings["calendar"]; canEdit: boolean }) {
  const { value: v, setValue: set, bar } = useSection("calendar", initial);
  return (
    <Section
      id="calendar"
      title="🗓 الأجندة الاقتصادية"
      description="من ForexFactory (مجاني). الأجندة اليومية تنزل أيام العمل، وتنبيه قبل كل خبر قوي مع شرح القراءة المعتادة للنتيجة."
      actions={canEdit && <span className="flex gap-2"><TestButton what="calendar" label="مزامنة" /><TestButton what="agenda" label="أجندة الآن" /></span>}
    >
      <p className="mb-2 text-sm font-semibold">العملات</p>
      <div className="mb-5 flex flex-wrap gap-2">
        {Object.entries(CURRENCY_LABEL).map(([c, label]) => {
          const on = v.currencies.includes(c);
          return (
            <button key={c} disabled={!canEdit} onClick={() => set({ ...v, currencies: on ? v.currencies.filter((x) => x !== c) : [...v.currencies, c] })} className={cn("rounded-full border px-3 py-1.5 text-xs", on ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground")}>
              {label}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Field label="أدنى تأثير">
          <select className={inputCls} value={v.min_impact} disabled={!canEdit} onChange={(e) => set({ ...v, min_impact: e.target.value as "high" | "medium" })}>
            <option value="high">🔴 المرتفع فقط</option>
            <option value="medium">🟠 المتوسط والمرتفع</option>
          </select>
        </Field>
        <Field label="موعد أجندة اليوم">
          <input className={inputCls} type="time" value={v.agenda_time} disabled={!canEdit} onChange={(e) => set({ ...v, agenda_time: e.target.value })} dir="ltr" />
        </Field>
        <Field label="التنبيه قبل الخبر (دقيقة)">
          <input className={inputCls} type="number" min={5} max={120} value={v.pre_alert_min} disabled={!canEdit} onChange={(e) => set({ ...v, pre_alert_min: Number(e.target.value) })} dir="ltr" />
        </Field>
        <Switch checked={v.agenda_enabled} disabled={!canEdit} onChange={(agenda_enabled) => set({ ...v, agenda_enabled })} label="نشر أجندة اليوم" />
        <Switch checked={v.pre_alert_enabled} disabled={!canEdit} onChange={(pre_alert_enabled) => set({ ...v, pre_alert_enabled })} label="تنبيه قبل الخبر القوي" />
        <Switch checked={v.explain} disabled={!canEdit} onChange={(explain) => set({ ...v, explain })} label="شرح القراءة المعتادة" description="إذا جاء أعلى/أقل من المتوقع شنو يصير عادةً" />
      </div>
      {bar(canEdit)}
    </Section>
  );
}

type GType = "morning" | "open" | "close";
const G_LABEL: Record<GType, string> = { morning: "☀️ التحية الصباحية", open: "🔔 افتتاح الأسواق", close: "🔕 إغلاق الأسواق" };

export function GreetingsSection({ initial, media, canEdit }: { initial: BotSettings["greetings"]; media: string[]; canEdit: boolean }) {
  const { value: v, setValue: set, bar } = useSection("greetings", initial);
  const [captionText, setCaptionText] = useState<Record<GType, string>>({
    morning: initial.captions.morning.join("\n---\n"),
    open: initial.captions.open.join("\n---\n"),
    close: initial.captions.close.join("\n---\n"),
  });
  return (
    <Section id="greetings" title="👋 التحيات بالصور" description="البوت يختار نصاً وصورة عشوائية ولا يكرر نفس النص مرتين متتاليتين. في العطل (من قائمة العطل) تتغير التحية تلقائياً.">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {(["morning", "open", "close"] as GType[]).map((t) => {
          const slot = v[t] as { enabled: boolean; time: string; day?: number; weekdays_only?: boolean };
          const setSlot = (patch: Partial<typeof slot>) => set({ ...v, [t]: { ...slot, ...patch } });
          return (
            <div key={t} className="space-y-3 rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{G_LABEL[t]}</p>
                <Switch checked={slot.enabled} disabled={!canEdit} onChange={(enabled) => setSlot({ enabled })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {t === "morning" ? (
                  <Switch checked={Boolean(slot.weekdays_only)} disabled={!canEdit} onChange={(weekdays_only) => setSlot({ weekdays_only })} label="أيام العمل فقط" />
                ) : (
                  <select className={inputCls} value={slot.day} disabled={!canEdit} onChange={(e) => setSlot({ day: Number(e.target.value) })}>
                    {DAYS.map((d, i) => (
                      <option key={d} value={i}>{d}</option>
                    ))}
                  </select>
                )}
                <input className={inputCls} type="time" value={slot.time} disabled={!canEdit} onChange={(e) => setSlot({ time: e.target.value })} dir="ltr" />
              </div>
              <Field label="النصوص (افصل بينها بسطر فيه ---)">
                <textarea
                  rows={6}
                  value={captionText[t]}
                  disabled={!canEdit}
                  onChange={(e) => {
                    setCaptionText({ ...captionText, [t]: e.target.value });
                    set({ ...v, captions: { ...v.captions, [t]: e.target.value.split(/\n-{3,}\n/).map((x) => x.trim()).filter(Boolean) } });
                  }}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </Field>
              <div>
                <p className="mb-1.5 text-sm font-medium">الصور ({v.images[t].length})</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {media.map((url) => {
                    const on = v.images[t].includes(url);
                    return (
                      <button
                        key={url}
                        disabled={!canEdit}
                        onClick={() => set({ ...v, images: { ...v.images, [t]: on ? v.images[t].filter((x) => x !== url) : [...v.images[t], url] } })}
                        className={cn("aspect-square overflow-hidden rounded border-2", on ? "border-primary" : "border-transparent opacity-50 hover:opacity-100")}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="h-full w-full object-cover" />
                      </button>
                    );
                  })}
                </div>
                {!media.length && <p className="text-xs text-muted-foreground">ارفع الصور من «مكتبة الصور» ثم اخترها هنا.</p>}
              </div>
              {canEdit && <TestButton what={t} label="تجربة الآن" />}
            </div>
          );
        })}
      </div>
      {bar(canEdit)}
    </Section>
  );
}

export function WeeklySection({ initial, canEdit }: { initial: BotSettings["weekly"]; canEdit: boolean }) {
  const { value: v, setValue: set, bar } = useSection("weekly", initial);
  return (
    <Section id="weekly" title="📅 ملخص الأسبوع والاستطلاع" description="أداء التوصيات وعدد المنشورات، مع استطلاع «ما توقعك للأسبوع القادم؟». الأسبوع التالي يقارن توقع الأغلبية بالحركة الفعلية." actions={canEdit && <TestButton what="weekly" label="تجربة الآن" />}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Switch checked={v.enabled} disabled={!canEdit} onChange={(enabled) => set({ ...v, enabled })} label="تفعيل الملخص" />
        <Field label="اليوم">
          <select className={inputCls} value={v.day} disabled={!canEdit} onChange={(e) => set({ ...v, day: Number(e.target.value) })}>
            {DAYS.map((d, i) => (<option key={d} value={i}>{d}</option>))}
          </select>
        </Field>
        <Field label="الوقت">
          <input className={inputCls} type="time" value={v.time} disabled={!canEdit} onChange={(e) => set({ ...v, time: e.target.value })} dir="ltr" />
        </Field>
        <Switch checked={v.poll.enabled} disabled={!canEdit} onChange={(enabled) => set({ ...v, poll: { ...v.poll, enabled } })} label="🗳 الاستطلاع" />
        <Field label="رمز الاستطلاع">
          <input className={inputCls} value={v.poll.symbol} disabled={!canEdit} onChange={(e) => set({ ...v, poll: { ...v.poll, symbol: e.target.value.toUpperCase() } })} dir="ltr" />
        </Field>
        <Field label="اسمه في السؤال">
          <input className={inputCls} value={v.poll.name} disabled={!canEdit} onChange={(e) => set({ ...v, poll: { ...v.poll, name: e.target.value } })} />
        </Field>
      </div>
      {bar(canEdit)}
    </Section>
  );
}

export function HolidaysSection({ initial, canEdit }: { initial: BotSettings["holidays"]; canEdit: boolean }) {
  const { value, setValue, bar } = useSection("holidays", initial);
  return (
    <Section id="holidays" title="🏖 عطل الأسواق" description="في العطلة: التحية الصباحية تنبّه، والافتتاح يُستبدل برسالة، والإغلاق والأجندة لا تنزل. الصيغة: MM-DD: الاسم">
      <ListInput
        value={value.map((h) => `${h.date}: ${h.name}`)}
        rows={5}
        placeholder={"12-25: عيد الميلاد\n01-01: رأس السنة"}
        onChange={(lines) =>
          setValue(
            lines
              .map((l) => {
                const m = l.match(/^(\d{2}-\d{2})\s*:?\s*(.*)$/);
                return m ? { date: m[1], name: m[2] || "عطلة" } : null;
              })
              .filter(Boolean) as BotSettings["holidays"],
          )
        }
      />
      {bar(canEdit)}
    </Section>
  );
}

export function TradingViewSection({ initial, webhookUrl, canEdit }: { initial: BotSettings["tradingview"]; webhookUrl: string | null; canEdit: boolean }) {
  const { value: v, setValue: set, bar } = useSection("tradingview", initial);
  return (
    <Section id="tradingview" title="🔔 تنبيهات TradingView (Webhook)" description="تحتاج اشتراك TradingView مدفوع. التنبيه يصير توصية تنزل فوراً بكل الأماكن.">
      <Switch checked={v.enabled} disabled={!canEdit} onChange={(enabled) => set({ ...v, enabled })} label="استقبال التنبيهات" />
      <div className="mt-4 space-y-2 text-sm">
        <p className="text-muted-foreground">رابط الـ Webhook (سري — ضعه في خانة Webhook URL في TradingView):</p>
        <code className="num block overflow-x-auto rounded-md border border-border bg-background px-3 py-2 text-xs" dir="ltr">
          {webhookUrl ?? "اضبط BOT_PUBLIC_URL في الموقع لعرض الرابط"}
        </code>
        <p className="text-muted-foreground">خانة Message:</p>
        <code className="num block overflow-x-auto whitespace-pre rounded-md border border-border bg-background px-3 py-2 text-xs" dir="ltr">
          {'{"symbol":"{{ticker}}","direction":"BUY","entry":{{close}},"sl":2340,"tp":2360,"notes":"كسر مقاومة"}'}
        </code>
      </div>
      {bar(canEdit)}
    </Section>
  );
}

export { DEFAULT_SETTINGS };
