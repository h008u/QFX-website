"""يولّد ملف CSS الثيمات (apps/web/app/themes.css) من تعريفات Hex — شغّله بعد تعديل أي لون."""
import colorsys, os

def hsl(h):
    h = h.lstrip('#'); r, g, b = (int(h[i:i+2], 16) / 255 for i in (0, 2, 4))
    hh, l, s = colorsys.rgb_to_hls(r, g, b)
    return f"{round(hh*360)} {round(s*100)}% {round(l*100)}%"

KEYS = ["background","foreground","card","card-foreground","muted","muted-foreground","secondary","secondary-foreground",
        "accent","accent-foreground","surface","primary","primary-foreground","destructive","destructive-foreground","success","gold",
        "border","input","ring","hero","hero-foreground","hero-muted","hero-accent"]

def pal(bg, fg, card, muted, mutedfg, secondary, surface, primary, primaryfg, down, up, gold, border, inp, hero, herofg, heromuted, heroaccent):
    return {"background":bg,"foreground":fg,"card":card,"card-foreground":fg,"muted":muted,"muted-foreground":mutedfg,
            "secondary":secondary,"secondary-foreground":fg,"accent":secondary,"accent-foreground":fg,"surface":surface,
            "primary":primary,"primary-foreground":primaryfg,"destructive":down,"destructive-foreground":"#FFFFFF","success":up,"gold":gold,
            "border":border,"input":inp,"ring":primary,"hero":hero,"hero-foreground":herofg,"hero-muted":heromuted,"hero-accent":heroaccent}

T = {
 "classic": {
   "light": pal("#FFFFFF","#131722","#FFFFFF","#F0F3FA","#787B86","#F0F3FA","#F8F9FD","#2962FF","#FFFFFF","#F23645","#089981","#FF9800","#E0E3EB","#D1D4DC","#0F0F0F","#FFFFFF","#9598A1","#5B8DEF"),
   "dark":  pal("#0F0F0F","#D1D4DC","#131722","#2A2E39","#787B86","#2A2E39","#1E222D","#2962FF","#FFFFFF","#F23645","#089981","#FF9800","#2A2E39","#363A45","#131722","#FFFFFF","#9598A1","#5B8DEF"),
   "extra": {"radius":"0.5rem","pill":"9999px","font-body":"var(--f-plex)","font-display":"var(--f-plex)",
             "font-num":'-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif',
             "chart-up":"#089981","chart-down":"#F23645","chart-accent":"#2962FF","panel":"#131722","panel-foreground":"#FFFFFF","panel-muted":"#B2B5BE","panel-accent":"#5B8DEF"},
 },
 "institutional": {
   "light": pal("#FAFAF7","#14213D","#FFFFFF","#F1F1EC","#6B7280","#EEF0F4","#F4F4EF","#0A1F44","#FFFFFF","#C8283A","#0B8A5F","#B8912F","#E5E7EB","#D1D5DB","#FFFFFF","#0A1F44","#4B5563","#B8912F"),
   "dark":  pal("#0B1324","#E5E9F0","#111B30","#1A2540","#8B96AB","#1A2540","#101A2E","#C9A54A","#0B1324","#E5484D","#22B07D","#C9A54A","#22304D","#2C3B5C","#0E1830","#F3F5F9","#8B96AB","#C9A54A"),
   "extra": {"radius":"0.125rem","pill":"0.125rem","font-body":"var(--f-plex)","font-display":"var(--f-kufi)","font-num":"var(--f-plexmono), ui-monospace, monospace",
             "chart-up":"#0B8A5F","chart-down":"#C8283A","chart-accent":"#0A1F44","panel":"#0A1F44","panel-foreground":"#FFFFFF","panel-muted":"#C2CBDC","panel-accent":"#D4B25A"},
   "extra-dark": {"chart-accent":"#C9A54A","panel":"#111B30"},
 },
 "terminal": {
   "dark": pal("#07090D","#C9D1D9","#0E1218","#131922","#6B7686","#131922","#0B0E14","#F5A524","#000000","#FF3B5C","#00C176","#F5A524","#1D2430","#283041","#0E1218","#FFFFFF","#6B7686","#F5A524"),
   "extra": {"radius":"0.25rem","pill":"0.25rem","font-body":"var(--f-plex)","font-display":"var(--f-plex)","font-num":"var(--f-jet), ui-monospace, monospace",
             "chart-up":"#00C176","chart-down":"#FF3B5C","chart-accent":"#F5A524","panel":"#0E1218","panel-foreground":"#FFFFFF","panel-muted":"#8B95A5","panel-accent":"#F5A524"},
 },
 "neon": {
   "dark": pal("#060816","#E6EAF5","#0E1330","#141A3A","#8A93B2","#161C3D","#0C1028","#5B6CFF","#FFFFFF","#FF5C7A","#2EE6A6","#22D3EE","#1E2550","#2A3263","#060816","#FFFFFF","#8A93B2","#22D3EE"),
   "extra": {"radius":"1rem","pill":"9999px","font-body":"var(--f-readex)","font-display":"var(--f-readex)","font-num":"var(--f-grotesk), var(--f-readex), sans-serif",
             "chart-up":"#2EE6A6","chart-down":"#FF5C7A","chart-accent":"#5B6CFF","panel":"#0E1330","panel-foreground":"#FFFFFF","panel-muted":"#A3ABC8","panel-accent":"#22D3EE"},
 },
 "luxe": {
   "dark": pal("#0A0907","#EDE6D6","#13110D","#1C1913","#8C8574","#1C1913","#100E0B","#D4AF37","#1A1408","#E5484D","#4CC38A","#D4AF37","#2A251B","#3A3326","#0A0907","#EDE6D6","#8C8574","#D4AF37"),
   "extra": {"radius":"0.125rem","pill":"0.125rem","font-body":"var(--f-tajawal)","font-display":"var(--f-messiri)","font-num":"var(--f-inter), sans-serif",
             "chart-up":"#4CC38A","chart-down":"#E5484D","chart-accent":"#D4AF37","panel":"#13110D","panel-foreground":"#EDE6D6","panel-muted":"#A39B87","panel-accent":"#D4AF37"},
 },
}

def block(sel, p, extra=None):
    lines = [f"  --{k}: {hsl(p[k])};" for k in KEYS]
    for k, v in (extra or {}).items():
        lines.append(f"  --{k}: {hsl(v) if k.startswith('panel') else v};")
    return f"{sel} {{\n" + "\n".join(lines) + "\n}\n"

out = ["/* مُولّد آلياً من scripts/gen-themes.py — لا تعدّله يدوياً */\n"]
c = T["classic"]
out.append(block(":root,\n[data-theme=\"classic\"]", c["light"], c["extra"]))
out.append(block(".dark,\n[data-theme=\"classic\"].dark", c["dark"]))
i = T["institutional"]
out.append(block("[data-theme=\"institutional\"]", i["light"], i["extra"]))
out.append(block("[data-theme=\"institutional\"].dark", i["dark"], i["extra-dark"]))
for name in ("terminal", "neon", "luxe"):
    out.append(block(f"[data-theme=\"{name}\"],\n[data-theme=\"{name}\"].dark", T[name]["dark"], T[name]["extra"]))
path = os.path.join(os.path.dirname(__file__), "..", "apps", "web", "app", "themes.css")
open(path, "w").write("\n".join(out))
print("wrote", os.path.normpath(path))
