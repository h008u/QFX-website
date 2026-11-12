-- =====================================================================
-- المقالات (المدونة): محتوى طويل بمحرر غني، يُنشر من لوحة الإدارة
-- body_html يُنظَّف على الخادم (sanitize-html) قبل الحفظ، ويُنظَّف مرة ثانية عند العرض
-- =====================================================================
create type public.article_status as enum ('draft', 'published', 'archived');

create table public.articles (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (char_length(slug) between 2 and 120 and slug !~ '[[:space:]/?#%\\]'),
  title           text not null check (char_length(title) between 3 and 200),
  excerpt         text check (excerpt is null or char_length(excerpt) <= 400),
  body_html       text not null default '' check (char_length(body_html) <= 200000),
  cover_url       text check (cover_url is null or cover_url ~ '^https?://'),
  category        text not null default 'تعليم' check (char_length(category) between 2 and 40),
  tags            text[] not null default '{}',
  status          public.article_status not null default 'draft',
  featured        boolean not null default false,
  seo_title       text check (seo_title is null or char_length(seo_title) <= 120),
  seo_description text check (seo_description is null or char_length(seo_description) <= 300),
  reading_minutes int not null default 1 check (reading_minutes between 1 and 120),
  author_id       uuid references public.profiles (id) on delete set null,
  author_name     text,
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index articles_published_idx on public.articles (status, published_at desc);
create index articles_category_idx on public.articles (category, published_at desc) where status = 'published';
create trigger articles_updated_at before update on public.articles
  for each row execute function public.set_updated_at();

alter table public.articles enable row level security;

-- الزوار يقرؤون المنشور فقط (وبعد موعد نشره)، والفريق يرى المسودات
create policy "articles: public read published" on public.articles
  for select to anon, authenticated
  using (status = 'published' and published_at <= now());
create policy "articles: staff read all" on public.articles
  for select to authenticated using (public.is_staff());
create policy "articles: editor write" on public.articles
  for all to authenticated using (public.is_editor()) with check (public.is_editor());
