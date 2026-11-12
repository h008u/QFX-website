import "server-only";
import { demoDb } from "./admin/demo";
import { isSupabaseConfigured } from "./supabase/env";
import { getServerClient } from "./supabase/server";

export type ArticleStatus = "draft" | "published" | "archived";

export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body_html: string;
  cover_url: string | null;
  category: string;
  tags: string[];
  status: ArticleStatus;
  featured: boolean;
  seo_title: string | null;
  seo_description: string | null;
  reading_minutes: number;
  author_name: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export const ARTICLE_CATEGORIES = ["تعليم", "تحليل", "استراتيجيات", "إدارة المخاطر", "أخبار الوكالة"];

/* eslint-disable @typescript-eslint/no-explicit-any */
const ago = (d: number) => new Date(Date.now() - d * 86400000).toISOString();

function seedDemo(db: any) {
  if (db.__articlesSeeded) return;
  db.__articlesSeeded = true;
  const rows: Partial<Article>[] = [
    {
      slug: "ما-هو-الفوركس",
      title: "ما هو الفوركس؟ دليل المبتدئ الكامل",
      excerpt: "سوق العملات بلغة بسيطة: كيف تتحرك الأسعار، ما هي الأزواج والنقاط واللوت، ومن أين تبدأ بأمان.",
      body_html:
        "<h2>سوق بلا مقر</h2><p>الفوركس هو سوق تبادل العملات العالمي، يعمل على مدار 24 ساعة خمسة أيام في الأسبوع عبر البنوك والوسطاء حول العالم.</p><h2>الأزواج والنقاط</h2><p>تُتداول العملات أزواجاً مثل <strong>EURUSD</strong>، وأصغر حركة سعرية تُسمى <em>نقطة</em>.</p><ul><li>اللوت القياسي = 100,000 وحدة</li><li>الميني لوت = 10,000 وحدة</li></ul><blockquote>ابدأ بحساب تجريبي، ولا تخاطر بأكثر من 1-2% من رأس مالك في الصفقة.</blockquote>",
      category: "تعليم",
      tags: ["مبتدئين", "فوركس"],
      featured: true,
      reading_minutes: 4,
      published_at: ago(3),
    },
    {
      slug: "إدارة-رأس-المال",
      title: "إدارة رأس المال: القاعدة التي تحميك من الخسارة الكبيرة",
      excerpt: "لماذا يخسر أغلب المتداولين؟ ليس بسبب التحليل، بل بسبب حجم الصفقة. إليك طريقة حساب اللوت المناسب.",
      body_html:
        "<h2>قاعدة الـ 1%</h2><p>حدّد مسبقاً أقصى خسارة تقبلها في الصفقة الواحدة، ثم احسب حجم اللوت من المسافة إلى وقف الخسارة.</p><h3>مثال</h3><p>حساب 1,000$ ومخاطرة 1% = 10$. إذا كان الوقف 20 نقطة على EURUSD فحجم الصفقة 0.05 لوت.</p>",
      category: "إدارة المخاطر",
      tags: ["إدارة رأس المال"],
      reading_minutes: 3,
      published_at: ago(6),
    },
    {
      slug: "قراءة-المفكرة-الاقتصادية",
      title: "كيف تقرأ المفكرة الاقتصادية وتتجنب تقلبات الأخبار",
      excerpt: "الأخبار عالية التأثير مثل الوظائف الأمريكية والتضخم قد تحرك الذهب مئات النقاط في دقائق.",
      body_html: "<h2>ما المهم في المفكرة؟</h2><p>ركّز على الأخبار ذات التأثير المرتفع، وقارن الرقم الفعلي بالتوقعات.</p>",
      category: "تحليل",
      tags: ["المفكرة الاقتصادية", "الذهب"],
      reading_minutes: 3,
      published_at: ago(10),
    },
  ];
  for (const r of rows) {
    db.t("articles").push({
      id: crypto.randomUUID(),
      cover_url: null,
      status: "published",
      featured: false,
      seo_title: null,
      seo_description: null,
      author_name: "فريق QFX",
      created_at: r.published_at,
      updated_at: r.published_at,
      ...r,
    });
  }
}

/** عميل القراءة: Supabase (يخضع لـ RLS) أو قاعدة المعاينة المزروعة بمقالات تجريبية */
function reader(): any | null {
  if (!isSupabaseConfigured) {
    const db = demoDb() as any;
    seedDemo(db);
    return db;
  }
  return getServerClient();
}

export function demoArticlesDb(): any {
  const db = demoDb() as any;
  seedDemo(db);
  return db;
}

const isLive = (a: Article) => a.status === "published" && !!a.published_at && a.published_at <= new Date().toISOString();

export async function getPublishedArticles(opts: { category?: string; limit?: number } = {}): Promise<Article[]> {
  const sb = reader();
  if (!sb) return [];
  let q = sb.from("articles").select("*").eq("status", "published");
  if (opts.category) q = q.eq("category", opts.category);
  const { data } = await q.order("published_at", { ascending: false }).limit(opts.limit ?? 50);
  return ((data ?? []) as Article[]).filter(isLive);
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const sb = reader();
  if (!sb) return null;
  const { data } = await sb.from("articles").select("*").eq("slug", slug).maybeSingle();
  const a = data as Article | null;
  return a && isLive(a) ? a : null;
}
