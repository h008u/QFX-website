"use client";

import { Check, Eye, EyeOff, GripVertical, ChevronDown, ChevronUp, LogOut, Pencil, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { canEditSiteAction, saveSiteContentAction } from "@/app/_actions/site-content";
import { DEFAULT_CONTENT, HOME_SECTION_LABEL, type HomeSectionId, type SiteContent } from "@/config/site-content";
import { cn } from "@/lib/utils";
import { usePointerReorder } from "./reorder";

const EDIT_KEY = "qfx-edit";

type ListName = "why" | "steps" | "faqs";

interface EditorState {
  content: SiteContent;
  editing: boolean;
  dirty: boolean;
  setText: (key: string, value: string) => void;
  setListField: (list: ListName, index: number, field: string, value: string) => void;
  setAnnouncement: (patch: Partial<SiteContent["announcement"]>) => void;
  moveSection: (from: number, to: number) => void;
  toggleSection: (id: HomeSectionId) => void;
}

const Ctx = createContext<EditorState | null>(null);

export function useSiteContent(): EditorState {
  const v = useContext(Ctx);
  if (!v) {
    // خارج المزوّد (مثلاً صفحات لا تستخدمه): المحتوى الافتراضي للقراءة فقط
    return {
      content: DEFAULT_CONTENT,
      editing: false,
      dirty: false,
      setText: () => {},
      setListField: () => {},
      setAnnouncement: () => {},
      moveSection: () => {},
      toggleSection: () => {},
    };
  }
  return v;
}

/** يوفّر محتوى الموقع لكل الصفحات، ويفعّل وضع التعديل المباشر للفريق عبر ?edit=1 */
export function SiteEditorProvider({ initial, children }: { initial: SiteContent; children: React.ReactNode }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<SiteContent>(initial);
  const [saved, setSaved] = useState<SiteContent>(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  useEffect(() => {
    setDraft(initial);
    setSaved(initial);
  }, [initial]);

  useEffect(() => {
    let want = false;
    try {
      const q = new URLSearchParams(location.search).get("edit");
      if (q === "1") sessionStorage.setItem(EDIT_KEY, "1");
      if (q === "0") sessionStorage.removeItem(EDIT_KEY);
      want = sessionStorage.getItem(EDIT_KEY) === "1";
    } catch {
      /* التخزين غير متاح */
    }
    if (!want) return;
    canEditSiteAction().then((ok) => {
      if (ok) setEditing(true);
      else {
        try {
          sessionStorage.removeItem(EDIT_KEY);
        } catch {
          /* */
        }
      }
    });
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("site-editing", editing);
  }, [editing]);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved]);

  // تحذير قبل مغادرة الصفحة مع تغييرات غير محفوظة
  useEffect(() => {
    if (!editing || !dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [editing, dirty]);

  const setText = useCallback((key: string, value: string) => setDraft((d) => ({ ...d, texts: { ...d.texts, [key]: value } })), []);
  const setListField = useCallback(
    (list: ListName, index: number, field: string, value: string) =>
      setDraft((d) => {
        const arr = [...(d[list] as unknown as Record<string, string>[])];
        arr[index] = { ...arr[index], [field]: value };
        return { ...d, [list]: arr } as SiteContent;
      }),
    [],
  );
  const setAnnouncement = useCallback((patch: Partial<SiteContent["announcement"]>) => setDraft((d) => ({ ...d, announcement: { ...d.announcement, ...patch } })), []);
  const moveSection = useCallback(
    (from: number, to: number) =>
      setDraft((d) => {
        if (to < 0 || to >= d.sections.length || from === to) return d;
        const s = [...d.sections];
        const [x] = s.splice(from, 1);
        s.splice(to, 0, x);
        return { ...d, sections: s };
      }),
    [],
  );
  const toggleSection = useCallback(
    (id: HomeSectionId) => setDraft((d) => ({ ...d, sections: d.sections.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s)) })),
    [],
  );

  const save = () =>
    start(async () => {
      const r = await saveSiteContentAction(draft);
      setMsg({ ok: r.ok, text: r.message });
      if (r.ok) {
        setSaved(draft);
        router.refresh();
      }
      setTimeout(() => setMsg(null), 3500);
    });
  const exit = () => {
    if (dirty && !confirm("لديك تغييرات غير محفوظة. الخروج بدون حفظ؟")) return;
    try {
      sessionStorage.removeItem(EDIT_KEY);
    } catch {
      /* */
    }
    setDraft(saved);
    setEditing(false);
    const u = new URL(location.href);
    u.searchParams.delete("edit");
    history.replaceState(null, "", u.toString());
  };

  const value: EditorState = { content: editing ? draft : saved, editing, dirty, setText, setListField, setAnnouncement, moveSection, toggleSection };

  return (
    <Ctx.Provider value={value}>
      {children}
      {editing && (
        <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-[70] mx-auto flex w-[min(100%-24px,720px)] flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-2.5 text-card-foreground shadow-2xl md:bottom-6">
          <span className="flex items-center gap-2 px-2 text-sm font-bold">
            <Pencil className="h-4 w-4 text-primary" /> وضع التعديل
          </span>
          <span className="hidden text-xs text-muted-foreground lg:inline">انقر أي نص لتعديله • اسحب الأقسام بالمقبض لترتيبها</span>
          <div className="ms-auto flex items-center gap-2">
            {msg && <span className={cn("text-xs font-semibold", msg.ok ? "text-up" : "text-down")}>{msg.text}</span>}
            <button
              onClick={() => setDraft(saved)}
              disabled={!dirty || pending}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold hover:bg-secondary disabled:opacity-40"
            >
              <RotateCcw className="h-4 w-4" /> تراجع
            </button>
            <button
              onClick={save}
              disabled={!dirty || pending}
              className="btn-primary inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            >
              <Check className="h-4 w-4" /> {pending ? "جارٍ الحفظ..." : "حفظ ونشر"}
            </button>
            <button onClick={exit} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold hover:bg-secondary" title="خروج من وضع التعديل">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

/** نص قابل للتعديل بالنقر في وضع التعديل. key = مفتاح من TEXT_FIELDS، أو list/index/field لعناصر القوائم */
export function EditableText({
  k,
  list,
  index,
  field,
  multiline,
  className,
  as: Tag = "span",
}: {
  k?: string;
  list?: ListName;
  index?: number;
  field?: string;
  multiline?: boolean;
  className?: string;
  as?: "span" | "p" | "h1" | "h2" | "h3" | "div";
}) {
  const { content, editing, setText, setListField } = useSiteContent();
  const value =
    k !== undefined
      ? content.texts[k] ?? ""
      : list && index !== undefined && field
        ? ((content[list] as unknown as Record<string, string>[])[index]?.[field] ?? "")
        : "";
  const ref = useRef<HTMLElement>(null);
  // نحدّث النص من الحالة فقط عندما لا يكون العنصر قيد الكتابة
  useEffect(() => {
    if (ref.current && document.activeElement !== ref.current && ref.current.textContent !== value) ref.current.textContent = value;
  }, [value]);
  if (!editing) return <Tag className={className}>{value}</Tag>;
  const commit = (v: string) => {
    const clean = v.replace(/\s+\n/g, "\n").trim();
    if (k !== undefined) setText(k, clean);
    else if (list && index !== undefined && field) setListField(list, index, field, clean);
  };
  return (
    <Tag
      ref={ref as never}
      className={cn("site-editable", className)}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      role="textbox"
      aria-multiline={multiline || undefined}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !multiline) {
          e.preventDefault();
          (e.currentTarget as HTMLElement).blur();
        }
        if (e.key === " ") e.stopPropagation(); // لا تفتح الأزرار والقوائم
      }}
      onPaste={(e) => {
        e.preventDefault();
        document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
      }}
      onBlur={(e) => commit(e.currentTarget.textContent ?? "")}
    >
      {value}
    </Tag>
  );
}

/** يرتّب أقسام الصفحة الرئيسية حسب المحتوى، ويضيف في وضع التعديل مقابض السحب والإخفاء */
export function EditableSections({ nodes }: { nodes: Partial<Record<HomeSectionId, React.ReactNode>> }) {
  const { content, editing, moveSection, toggleSection } = useSiteContent();
  const { from, over, start } = usePointerReorder(moveSection);
  const list = content.sections.filter((s) => nodes[s.id] !== undefined);

  if (!editing) return <>{list.filter((s) => s.visible).map((s) => <div key={s.id}>{nodes[s.id]}</div>)}</>;

  const indexOf = (id: HomeSectionId) => content.sections.findIndex((s) => s.id === id);
  return (
    <>
      {list.map((s, i) => {
        const idx = indexOf(s.id);
        return (
          <div
            key={s.id}
            data-reorder-idx={idx}
            className={cn(
              "site-section relative",
              over === idx && from !== null && from !== idx && (from > idx ? "site-section-over" : "site-section-over-after"),
              from === idx && "opacity-50",
            )}
          >
            <div className="site-section-bar">
              <span onPointerDown={start(idx)} className="flex cursor-grab touch-none items-center gap-1 active:cursor-grabbing" title="اسحب لتغيير الترتيب">
                <GripVertical className="h-4 w-4" />
                {HOME_SECTION_LABEL[s.id]}
              </span>
              <button onClick={() => moveSection(idx, idx - 1)} disabled={i === 0} aria-label="تحريك للأعلى" className="disabled:opacity-30">
                <ChevronUp className="h-4 w-4" />
              </button>
              <button onClick={() => moveSection(idx, idx + 1)} disabled={i === list.length - 1} aria-label="تحريك للأسفل" className="disabled:opacity-30">
                <ChevronDown className="h-4 w-4" />
              </button>
              <button onClick={() => toggleSection(s.id)} className="flex items-center gap-1">
                {s.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                {s.visible ? "ظاهر" : "مخفي"}
              </button>
            </div>
            {s.visible ? nodes[s.id] : <div className="site-section-hidden">هذا القسم مخفي عن الزوار — اضغط «مخفي» لإظهاره</div>}
          </div>
        );
      })}
    </>
  );
}

/** شريط إعلان أعلى الموقع (قابل للتعديل والإخفاء) */
export function AnnouncementBar() {
  const { content, editing, setAnnouncement } = useSiteContent();
  const a = content.announcement;
  if (!a.visible && !editing) return null;
  const body = editing ? (
    <span
      className="site-editable"
      contentEditable
      suppressContentEditableWarning
      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), (e.currentTarget as HTMLElement).blur())}
      onBlur={(e) => setAnnouncement({ text: (e.currentTarget.textContent ?? "").trim() })}
    >
      {a.text}
    </span>
  ) : a.href ? (
    <a href={a.href} className="hover:underline">
      {a.text}
    </a>
  ) : (
    a.text
  );
  return (
    <div className={cn("announcement-bar bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground", !a.visible && "opacity-50")}>
      {body}
      {editing && (
        <button onClick={() => setAnnouncement({ visible: !a.visible })} className="ms-3 rounded bg-primary-foreground/20 px-2 py-0.5 text-xs">
          {a.visible ? "إخفاء الشريط" : "إظهار الشريط"}
        </button>
      )}
    </div>
  );
}
