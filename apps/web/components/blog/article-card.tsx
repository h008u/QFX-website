import Link from "next/link";
import type { Article } from "@/lib/articles";
import { cn } from "@/lib/utils";

const dateFmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("ar", { year: "numeric", month: "long", day: "numeric" }) : "");

/** غلاف المقال: الصورة إن وُجدت، وإلا لوحة بلون الثيم مع العنوان */
export function ArticleCover({ a, big }: { a: Pick<Article, "cover_url" | "title" | "category">; big?: boolean }) {
  if (a.cover_url)
     
    return <img src={a.cover_url} alt="" loading="lazy" className="aspect-[1200/630] w-full rounded-xl border border-border object-cover" />;
  return (
    <div className="glass-card relative flex aspect-[1200/630] w-full flex-col justify-end overflow-hidden rounded-xl bg-panel p-5 text-panel-foreground">
      <svg className="absolute inset-0 h-full w-full text-panel-accent opacity-40" viewBox="0 0 400 210" preserveAspectRatio="none" aria-hidden>
        <path d="M0 170 L50 150 L90 160 L140 110 L190 125 L240 80 L290 95 L340 50 L400 65" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
      <span className="relative text-xs font-semibold text-panel-accent">{a.category}</span>
      <span className={cn("relative mt-1 line-clamp-2 font-bold leading-snug", big ? "text-2xl md:text-3xl" : "text-lg")}>{a.title}</span>
    </div>
  );
}

export function ArticleCard({ a, big }: { a: Article; big?: boolean }) {
  return (
    <Link href={`/blog/${encodeURIComponent(a.slug)}`} className={cn("group block", big && "md:grid md:grid-cols-[1.2fr_1fr] md:items-center md:gap-8")}>
      <ArticleCover a={a} big={big} />
      <div className="mt-3 md:mt-0">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-primary">{a.category}</span> • {dateFmt(a.published_at)} • {a.reading_minutes} د قراءة
        </p>
        <h3 className={cn("mt-1 font-bold leading-snug group-hover:text-primary", big ? "text-2xl md:text-[32px]" : "text-lg")}>{a.title}</h3>
        {a.excerpt && <p className={cn("mt-2 text-muted-foreground", big ? "text-[15px] leading-7" : "line-clamp-2 text-sm leading-6")}>{a.excerpt}</p>}
      </div>
    </Link>
  );
}

export { dateFmt };
