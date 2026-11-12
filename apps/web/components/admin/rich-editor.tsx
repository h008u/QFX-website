"use client";

import Image from "@tiptap/extension-image";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold, Code, Heading2, Heading3, ImagePlus, Italic, Link2, List, ListOrdered, Minus, Quote, Redo2, Strikethrough, Underline as UnderlineIcon, Undo2, Unlink,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** محرر نصوص غني (TipTap) للمقالات — اتجاه عربي، عناوين H2/H3، قوائم، اقتباس، روابط وصور */
export function RichEditor({ value, onChange, disabled }: { value: string; onChange: (html: string) => void; disabled?: boolean }) {
  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true, // حالة أزرار الشريط (عريض، عنوان...) تتبع المؤشر
    editable: !disabled,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener nofollow" } } }),
      Image.configure({ inline: false }),
    ],
    content: value,
    editorProps: { attributes: { dir: "rtl", class: "article-body min-h-[420px] px-5 py-4 focus:outline-none" } },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });
  const s = editor
    ? {
        bold: editor.isActive("bold"),
        italic: editor.isActive("italic"),
        underline: editor.isActive("underline"),
        strike: editor.isActive("strike"),
        h2: editor.isActive("heading", { level: 2 }),
        h3: editor.isActive("heading", { level: 3 }),
        ul: editor.isActive("bulletList"),
        ol: editor.isActive("orderedList"),
        quote: editor.isActive("blockquote"),
        code: editor.isActive("codeBlock"),
        link: editor.isActive("link"),
        undo: editor.can().undo(),
        redo: editor.can().redo(),
      }
    : null;
  if (!editor || !s) return <div className="h-[480px] animate-pulse rounded-lg border border-border bg-secondary/40" />;
  const B = ({ on, active, label, children, off }: { on: () => void; active?: boolean; label: string; children: React.ReactNode; off?: boolean }) => (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled || off}
      onMouseDown={(e) => e.preventDefault()}
      onClick={on}
      className={cn("grid h-8 w-8 place-items-center rounded hover:bg-secondary disabled:opacity-30", active && "bg-primary/15 text-primary")}
    >
      {children}
    </button>
  );
  const c = () => editor.chain().focus();
  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = prompt("الرابط (https://...)", prev ?? "https://");
    if (url === null) return;
    if (!url || url === "https://") return c().unsetLink().run();
    if (!/^(https?:\/\/|\/|mailto:)/.test(url)) return alert("الرابط يجب أن يبدأ بـ https:// أو /");
    c().extendMarkRange("link").setLink({ href: url }).run();
  };
  const addImage = () => {
    const url = prompt("رابط الصورة (https://...) — يمكنك نسخه من مكتبة الصور");
    if (url && /^https?:\/\//.test(url)) c().setImage({ src: url, alt: prompt("وصف الصورة (للبحث وذوي الإعاقة)") ?? "" }).run();
  };
  return (
    <div className="rounded-lg border border-input bg-background">
      <div className="sticky top-14 z-10 flex flex-wrap items-center gap-0.5 rounded-t-lg border-b border-border bg-card/95 p-1.5 backdrop-blur">
        <B on={() => c().toggleHeading({ level: 2 }).run()} active={s.h2} label="عنوان رئيسي"><Heading2 className="h-4 w-4" /></B>
        <B on={() => c().toggleHeading({ level: 3 }).run()} active={s.h3} label="عنوان فرعي"><Heading3 className="h-4 w-4" /></B>
        <span className="mx-1 h-5 w-px bg-border" />
        <B on={() => c().toggleBold().run()} active={s.bold} label="عريض"><Bold className="h-4 w-4" /></B>
        <B on={() => c().toggleItalic().run()} active={s.italic} label="مائل"><Italic className="h-4 w-4" /></B>
        <B on={() => c().toggleUnderline().run()} active={s.underline} label="تسطير"><UnderlineIcon className="h-4 w-4" /></B>
        <B on={() => c().toggleStrike().run()} active={s.strike} label="شطب"><Strikethrough className="h-4 w-4" /></B>
        <span className="mx-1 h-5 w-px bg-border" />
        <B on={() => c().toggleBulletList().run()} active={s.ul} label="قائمة نقطية"><List className="h-4 w-4" /></B>
        <B on={() => c().toggleOrderedList().run()} active={s.ol} label="قائمة مرقمة"><ListOrdered className="h-4 w-4" /></B>
        <B on={() => c().toggleBlockquote().run()} active={s.quote} label="اقتباس"><Quote className="h-4 w-4" /></B>
        <B on={() => c().toggleCodeBlock().run()} active={s.code} label="كود"><Code className="h-4 w-4" /></B>
        <B on={() => c().setHorizontalRule().run()} label="فاصل"><Minus className="h-4 w-4" /></B>
        <span className="mx-1 h-5 w-px bg-border" />
        <B on={setLink} active={s.link} label="رابط"><Link2 className="h-4 w-4" /></B>
        <B on={() => c().unsetLink().run()} off={!s.link} label="إزالة الرابط"><Unlink className="h-4 w-4" /></B>
        <B on={addImage} label="صورة"><ImagePlus className="h-4 w-4" /></B>
        <span className="ms-auto" />
        <B on={() => c().undo().run()} off={!s.undo} label="تراجع"><Undo2 className="h-4 w-4" /></B>
        <B on={() => c().redo().run()} off={!s.redo} label="إعادة"><Redo2 className="h-4 w-4" /></B>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
