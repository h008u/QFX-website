"use client";

import { CURRENCY_LABEL, type BotSettings } from "@qfx/shared";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Section, Switch } from "../ui";
import { DAYS, Field, inputCls, TestButton, useSection } from "./common";

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
                        { }
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

export function ExtrasSection({
  outlook,
  results,
  views,
  canEdit,
}: {
  outlook: BotSettings["outlook"];
  results: BotSettings["event_results"];
  views: BotSettings["views"];
  canEdit: boolean;
}) {
  const o = useSection("outlook", outlook);
  const r = useSection("event_results", results);
  const v = useSection("views", views);
  return (
    <Section id="extras" title="🔭 نظرة الأسبوع، نتائج الأخبار، والمشاهدات">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-3 rounded-lg border border-border p-4">
          <Switch checked={o.value.enabled} disabled={!canEdit} onChange={(enabled) => o.setValue({ ...o.value, enabled })} label="نظرة الأسبوع" description="أهم أحداث الأسبوع والتوصيات المفتوحة في منشور واحد" />
          <div className="grid grid-cols-2 gap-2">
            <select className={inputCls} value={o.value.day} disabled={!canEdit} onChange={(e) => o.setValue({ ...o.value, day: Number(e.target.value) })}>
              {DAYS.map((d, i) => (<option key={d} value={i}>{d}</option>))}
            </select>
            <input className={inputCls} type="time" value={o.value.time} disabled={!canEdit} onChange={(e) => o.setValue({ ...o.value, time: e.target.value })} dir="ltr" />
          </div>
          {canEdit && <TestButton what="outlook" label="تجربة الآن" />}
          {o.bar(canEdit)}
        </div>
        <div className="space-y-3 rounded-lg border border-border p-4">
          <Switch checked={r.value.enabled} disabled={!canEdit} onChange={(enabled) => r.setValue({ enabled })} label="📢 نتيجة الخبر بعد صدوره" description="الفعلي مقابل المتوقع وحجم المفاجأة والقراءة المعتادة. يعمل فقط إذا كان مصدر المفكرة يعطي الرقم الفعلي." />
          {r.bar(canEdit)}
        </div>
        <div className="space-y-3 rounded-lg border border-border p-4">
          <Switch checked={v.value.enabled} disabled={!canEdit} onChange={(enabled) => v.setValue({ enabled })} label="👁 عدّ المشاهدات" description="كل ساعة من صفحة القناة العامة (t.me/s). للقنوات العامة فقط، والأرقام تقريبية." />
          {canEdit && <TestButton what="views" label="تحديث الآن" />}
          {v.bar(canEdit)}
        </div>
      </div>
    </Section>
  );
}
