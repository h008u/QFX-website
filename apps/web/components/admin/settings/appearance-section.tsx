"use client";

import { Check, ExternalLink, Moon, SunMoon } from "lucide-react";
import { useState } from "react";
import { saveAppearanceAction } from "@/app/admin/_actions/appearance";
import { Button } from "@/components/ui/button";
import { SITE_THEMES, type SiteThemeId } from "@/config/themes";
import { cn } from "@/lib/utils";
import { ActionMessage, Section, useAction } from "../ui";

/** معاينة مصغّرة للثيم: شريط علوي، عنوان، أزرار، وشارت صغير */
function Mini({ swatch }: { swatch: [string, string, string, string] }) {
  const [bg, fg, primary, accent] = swatch;
  return (
    <svg viewBox="0 0 220 120" className="block w-full rounded-md border border-border" aria-hidden>
      <rect width="220" height="120" fill={bg} />
      <rect width="220" height="16" fill={fg} opacity="0.06" />
      <circle cx="206" cy="8" r="4" fill={primary} />
      <rect x="150" y="5" width="44" height="6" rx="2" fill={fg} opacity="0.5" />
      <rect x="120" y="30" width="86" height="10" rx="2" fill={fg} />
      <rect x="140" y="45" width="66" height="10" rx="2" fill={accent} />
      <rect x="150" y="64" width="56" height="5" rx="2" fill={fg} opacity="0.35" />
      <rect x="160" y="80" width="46" height="14" rx="3" fill={primary} />
      <rect x="120" y="80" width="36" height="14" rx="3" fill="none" stroke={fg} strokeOpacity="0.3" />
      <polyline points="10,100 25,92 40,96 55,80 70,84 85,64 100,70" fill="none" stroke={accent} strokeWidth="2" />
      <polyline points="10,100 25,92 40,96 55,80 70,84 85,64 100,70 100,110 10,110" fill={accent} opacity="0.12" />
    </svg>
  );
}

export function AppearanceSection({ current, canEdit }: { current: SiteThemeId; canEdit: boolean }) {
  const [sel, setSel] = useState<SiteThemeId>(current);
  const [saved, setSaved] = useState<SiteThemeId>(current);
  const save = useAction(async (id: SiteThemeId) => {
    const r = await saveAppearanceAction(id);
    if (r.ok) setSaved(id);
    return r;
  });
  return (
    <Section
      id="appearance"
      title="🎨 مظهر الموقع"
      description="اختر ثيم الواجهة العامة للموقع. «معاينة» تفتح الموقع بالثيم في تبويب جديد لك وحدك دون أن يتغير لدى الزوار، و«تطبيق» يغيّره للجميع فوراً."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {SITE_THEMES.map((t) => {
          const active = sel === t.id;
          return (
            <div
              key={t.id}
              role="button"
              tabIndex={0}
              onClick={() => setSel(t.id)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSel(t.id)}
              className={cn(
                "cursor-pointer rounded-lg border-2 p-3 text-start transition-colors",
                active ? "border-primary bg-primary/5" : "border-border hover:border-input",
              )}
            >
              <Mini swatch={t.swatch} />
              <div className="mt-3 flex items-center gap-2">
                <p className="font-bold">{t.name}</p>
                {t.id === "institutional" && <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold">الافتراضي</span>}
                {saved === t.id && (
                  <span className="ms-auto inline-flex items-center gap-1 text-xs font-semibold text-up">
                    <Check className="h-3.5 w-3.5" /> مطبّق
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{t.tagline}</p>
              <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  {t.mode === "dark" ? <Moon className="h-3.5 w-3.5" /> : <SunMoon className="h-3.5 w-3.5" />}
                  {t.mode === "dark" ? "داكن دائماً" : "فاتح + داكن"}
                </span>
                <a href={`/?theme=${t.id}`} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                  معاينة <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
      {canEdit ? (
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <Button size="sm" disabled={save.pending || sel === saved} onClick={() => save.run(sel)}>
            {save.pending ? "جارٍ التطبيق..." : "تطبيق على الموقع"}
          </Button>
          {sel !== saved && !save.result && <span className="text-xs text-gold">لم يُطبّق بعد</span>}
          <ActionMessage result={save.result} />
        </div>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">تغيير المظهر متاح للمدير فقط.</p>
      )}
    </Section>
  );
}
