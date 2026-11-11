-- =====================================================================
-- لوحة الإدارة: الفريق (مدير/محرر/مشاهد)، المنشورات وسجل التدفق والموافقة والجدولة،
-- الإعدادات، تنبيهات الأسعار، سجل النشاط، حالة المهام، ومكتبة الصور.
-- =====================================================================

-- أدوار الفريق: admin = المالك، editor = يكتب وينشر ويوافق، viewer = يشاهد فقط
alter type public.user_role add value if not exists 'editor';
alter type public.user_role add value if not exists 'viewer';

-- نقارن role::text لأن القيم الجديدة لا تُستخدم كـ enum في نفس المعاملة
create or replace function public.staff_role()
returns text language sql stable security definer set search_path = '' as $$
  select p.role::text from public.profiles p
   where p.id = auth.uid() and p.role::text in ('admin', 'editor', 'viewer');
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.staff_role() is not null;
$$;

create or replace function public.is_editor()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.staff_role() in ('admin', 'editor'), false);
$$;

-- =====================================================================
-- settings: إعدادات البوت واللوحة (مفتاح ← JSON). البوت يقرأها بـ service_role
-- =====================================================================
create table public.settings (
  key        text primary key check (key ~ '^[a-z0-9_.]{2,64}$'),
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);
create trigger settings_updated_at before update on public.settings
  for each row execute function public.set_updated_at();

-- =====================================================================
-- posts: كل منشور يمر بالبوت (يدوي، خبر، أجندة، تنبيه...) — سجل التدفق + الموافقة + الجدولة
-- =====================================================================
create type public.post_status as enum (
  'draft', 'pending', 'scheduled', 'publishing', 'published', 'partial', 'failed', 'rejected', 'filtered', 'duplicate'
);
create type public.post_kind as enum (
  'manual', 'news', 'agenda', 'event_alert', 'event_result', 'tradingview', 'signal',
  'greeting', 'weekly', 'outlook', 'price_alert'
);

create table public.posts (
  id            uuid primary key default gen_random_uuid(),
  kind          public.post_kind not null default 'manual',
  status        public.post_status not null default 'draft',
  title         text,
  body          text not null check (char_length(body) between 1 and 4000),
  -- markup = **عريض** __مائل__ [نص](رابط) ، html = جاهز لتيليجرام (التوصيات)
  format        text not null default 'markup' check (format in ('markup', 'html')),
  -- رد على منشور سابق (تحديثات التوصية تنزل كرد على رسالتها بكل مكان)
  reply_to      uuid references public.posts (id) on delete set null,
  photo_url     text,
  source        text,
  source_url    text,
  external_id   text unique,
  fingerprint   jsonb,
  categories    text[] not null default '{}',
  score         int check (score between 0 and 100),
  reason        text,
  disclaimer    boolean not null default false,
  scheduled_at  timestamptz,
  published_at  timestamptz,
  -- نتيجة كل مكان نشر: [{dest, ok, message_id, error, at}]
  results       jsonb not null default '[]',
  created_by    uuid references public.profiles (id) on delete set null,
  approved_by   uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index posts_created_idx on public.posts (created_at desc);
create index posts_status_idx on public.posts (status, created_at desc);
create index posts_due_idx on public.posts (scheduled_at) where status = 'scheduled';
create trigger posts_updated_at before update on public.posts
  for each row execute function public.set_updated_at();

-- بيانات إضافية لأحداث المفكرة (العنوان الإنجليزي، المتوقع، السابق)
alter table public.news add column meta jsonb;

-- =====================================================================
-- price_alerts: "إذا XAUUSD صعد فوق 2400" — البوت يفحص السعر دورياً
-- =====================================================================
create table public.price_alerts (
  id              uuid primary key default gen_random_uuid(),
  symbol          text not null check (symbol ~ '^[A-Z0-9]{3,12}$'),
  direction       text not null check (direction in ('above', 'below')),
  price           numeric(18, 6) not null check (price > 0),
  note            text,
  repeat          boolean not null default false,
  cooldown_min    int not null default 60 check (cooldown_min between 5 and 10080),
  active          boolean not null default true,
  last_price      numeric(18, 6),
  last_checked_at timestamptz,
  triggered_at    timestamptz,
  trigger_count   int not null default 0,
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now()
);

-- =====================================================================
-- audit_log: سجل النشاط — كل تغيير باللوحة باسم من سوّاه
-- =====================================================================
create table public.audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid references public.profiles (id) on delete set null,
  actor_email text,
  action      text not null,
  target      text,
  details     jsonb,
  ip          text,
  created_at  timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);

-- =====================================================================
-- task_runs: آخر تشغيل لكل مهمة آلية (صحة النظام)
-- =====================================================================
create table public.task_runs (
  task        text primary key,
  last_run_at timestamptz,
  ok          boolean,
  error       text,
  result      jsonb,
  runs        int not null default 0,
  failures    int not null default 0
);

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.settings     enable row level security;
alter table public.posts        enable row level security;
alter table public.price_alerts enable row level security;
alter table public.audit_log    enable row level security;
alter table public.task_runs    enable row level security;

create policy "settings: staff read"   on public.settings for select to authenticated using (public.is_staff());
create policy "settings: editor write" on public.settings for all    to authenticated using (public.is_editor()) with check (public.is_editor());

create policy "posts: staff read"   on public.posts for select to authenticated using (public.is_staff());
create policy "posts: editor write" on public.posts for all    to authenticated using (public.is_editor()) with check (public.is_editor());

create policy "alerts: staff read"   on public.price_alerts for select to authenticated using (public.is_staff());
create policy "alerts: editor write" on public.price_alerts for all    to authenticated using (public.is_editor()) with check (public.is_editor());

create policy "audit: staff read" on public.audit_log for select to authenticated using (public.is_staff());
create policy "audit: staff insert own" on public.audit_log for insert to authenticated
  with check (public.is_staff() and actor_id = auth.uid());

create policy "tasks: staff read" on public.task_runs for select to authenticated using (public.is_staff());

-- المحررون يديرون التوصيات والأخبار والعملاء ويشرفون على التعليقات
drop policy "signals: admin write" on public.signals;
create policy "signals: editor write" on public.signals for all to authenticated using (public.is_editor()) with check (public.is_editor());
drop policy "news: admin write" on public.news;
create policy "news: editor write" on public.news for all to authenticated using (public.is_editor()) with check (public.is_editor());

drop policy "leads: admin read" on public.leads;
drop policy "leads: admin update" on public.leads;
create policy "leads: staff read"    on public.leads for select to authenticated using (public.is_staff());
create policy "leads: editor update" on public.leads for update to authenticated using (public.is_editor()) with check (public.is_editor());

drop policy "comments: delete own or admin" on public.comments;
create policy "comments: delete own or editor" on public.comments for delete to authenticated
  using (author_id = auth.uid() or public.is_editor());

-- الفريق يرى ملفات الأعضاء (قائمة الأعضاء والإحالات)
drop policy "profiles: read own or admin" on public.profiles;
create policy "profiles: read own or staff" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff());

-- سجل التدفق يتحدث مباشرة في اللوحة
alter publication supabase_realtime add table public.posts;

-- =====================================================================
-- مكتبة الصور (Supabase Storage): قراءة عامة، رفع وحذف للمحررين
-- =====================================================================
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public) values ('media', 'media', true) on conflict (id) do nothing;
    execute $p$create policy "media: editor upload" on storage.objects for insert to authenticated
      with check (bucket_id = 'media' and public.is_editor())$p$;
    execute $p$create policy "media: editor delete" on storage.objects for delete to authenticated
      using (bucket_id = 'media' and public.is_editor())$p$;
  end if;
end $$;
