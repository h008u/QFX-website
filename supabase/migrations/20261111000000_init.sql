-- =====================================================================
-- QFX IB Platform — المخطط الأساسي لقاعدة البيانات (Supabase / PostgreSQL)
-- الجداول: profiles (المستخدمون) ، signals ، news ، comments ، leads (CRM مصغّر)
-- مع تفعيل Row Level Security و Realtime
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- الأنواع ----------
create type public.user_role       as enum ('member', 'admin');
create type public.signal_direction as enum ('BUY', 'SELL');
create type public.signal_status   as enum ('pending', 'open', 'tp_hit', 'sl_hit', 'closed', 'cancelled');
create type public.signal_source   as enum ('admin', 'telegram', 'tradingview');
create type public.asset_class     as enum ('forex', 'gold', 'oil', 'indices', 'crypto');
create type public.news_kind       as enum ('news', 'analysis', 'calendar', 'announcement');
create type public.impact_level    as enum ('low', 'medium', 'high');
create type public.lead_status     as enum ('new', 'contacted', 'registered', 'verified', 'funded', 'rejected');

-- ---------- دالة تحديث updated_at ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- =====================================================================
-- profiles: ملف تعريف لكل مستخدم في auth.users ("users")
-- =====================================================================
create table public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  full_name         text,
  telegram_username text,
  role              public.user_role not null default 'member',
  referral_code     text unique default substr(md5(gen_random_uuid()::text), 1, 8),
  referred_by       text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- إنشاء ملف تعريف تلقائياً عند تسجيل مستخدم جديد
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, referred_by)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'referred_by'
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- هل المستخدم الحالي مدير؟ (security definer لتجنّب التكرار اللانهائي في RLS)
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- =====================================================================
-- signals: التوصيات
-- =====================================================================
create table public.signals (
  id                  uuid primary key default gen_random_uuid(),
  symbol              text not null check (char_length(symbol) between 3 and 20),
  asset_class         public.asset_class not null default 'forex',
  direction           public.signal_direction not null,
  entry_price         numeric(18, 6) not null check (entry_price > 0),
  stop_loss           numeric(18, 6) not null check (stop_loss > 0),
  take_profit_1       numeric(18, 6) not null check (take_profit_1 > 0),
  take_profit_2       numeric(18, 6),
  take_profit_3       numeric(18, 6),
  status              public.signal_status not null default 'open',
  result_pips         numeric(12, 1),
  notes               text,
  source              public.signal_source not null default 'admin',
  telegram_message_id bigint,
  opened_at           timestamptz default now(),
  closed_at           timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index signals_created_at_idx on public.signals (created_at desc);
create index signals_status_idx on public.signals (status);
create trigger signals_updated_at before update on public.signals
  for each row execute function public.set_updated_at();

-- إحصائيات الأداء (security_invoker لتطبيق RLS الخاصة بالجدول)
create view public.signal_stats with (security_invoker = on) as
select
  count(*)::int                                                         as total,
  count(*) filter (where status in ('pending', 'open'))::int            as open,
  count(*) filter (where status in ('tp_hit', 'sl_hit', 'closed'))::int as closed,
  count(*) filter (where status = 'tp_hit'
                     or (status = 'closed' and result_pips > 0))::int   as wins,
  count(*) filter (where status = 'sl_hit'
                     or (status = 'closed' and result_pips < 0))::int   as losses,
  round(
    100.0 * count(*) filter (where status = 'tp_hit' or (status = 'closed' and result_pips > 0))
    / nullif(count(*) filter (where status in ('tp_hit', 'sl_hit')
                                 or (status = 'closed' and result_pips <> 0)), 0),
    1
  )                                                                     as win_rate,
  coalesce(sum(result_pips), 0)::numeric(14, 1)                         as total_pips
from public.signals
where status <> 'cancelled';

-- =====================================================================
-- news: الأخبار والتحليلات والمفكرة الاقتصادية
-- =====================================================================
create table public.news (
  id                    uuid primary key default gen_random_uuid(),
  kind                  public.news_kind not null default 'news',
  asset_class           public.asset_class,
  title                 text not null check (char_length(title) between 2 and 300),
  body                  text,
  impact                public.impact_level,
  currency              text,
  source                text,
  source_url            text,
  external_id           text unique,          -- لمنع تكرار الأخبار المسحوبة آلياً
  event_time            timestamptz,
  published_to_telegram boolean not null default false,
  telegram_message_id   bigint,
  created_at            timestamptz not null default now()
);
create index news_created_at_idx on public.news (created_at desc);
create index news_kind_idx on public.news (kind);
create index news_event_time_idx on public.news (event_time) where kind = 'calendar';

-- =====================================================================
-- comments: تعليقات المجتمع على الأخبار والتوصيات
-- =====================================================================
create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null references public.profiles (id) on delete cascade,
  news_id    uuid references public.news (id) on delete cascade,
  signal_id  uuid references public.signals (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  constraint comments_one_target check ((news_id is null) <> (signal_id is null))
);
create index comments_news_idx on public.comments (news_id, created_at);
create index comments_signal_idx on public.comments (signal_id, created_at);

-- =====================================================================
-- leads: CRM مصغّر لتتبع العملاء المسجّلين عبر رابط الإحالة
-- =====================================================================
create table public.leads (
  id                uuid primary key default gen_random_uuid(),
  full_name         text not null check (char_length(full_name) between 2 and 120),
  email             text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone             text,
  telegram_username text,
  broker            text,
  broker_account_id text,
  status            public.lead_status not null default 'new',
  referral_source   text,
  notes             text,
  profile_id        uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint leads_contact check (email is not null or phone is not null or telegram_username is not null)
);
create index leads_status_idx on public.leads (status, created_at desc);
create trigger leads_updated_at before update on public.leads
  for each row execute function public.set_updated_at();

-- =====================================================================
-- Row Level Security
-- ملاحظة: خدمة البوت تستخدم service_role التي تتجاوز RLS.
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.signals  enable row level security;
alter table public.news     enable row level security;
alter table public.comments enable row level security;
alter table public.leads    enable row level security;

-- profiles
create policy "profiles: read own or admin" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles: admin manage" on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- لا يُسمح للمستخدم بتعديل الدور أو كود الإحالة بنفسه
revoke update on public.profiles from authenticated;
grant update (full_name, telegram_username) on public.profiles to authenticated;

-- signals: قراءة عامة، كتابة للمدير فقط
create policy "signals: public read" on public.signals
  for select to anon, authenticated using (true);
create policy "signals: admin write" on public.signals
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- news: قراءة عامة، كتابة للمدير فقط
create policy "news: public read" on public.news
  for select to anon, authenticated using (true);
create policy "news: admin write" on public.news
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- comments: قراءة عامة، كتابة للمستخدمين المسجّلين باسمهم فقط
create policy "comments: public read" on public.comments
  for select to anon, authenticated using (true);
create policy "comments: insert own" on public.comments
  for insert to authenticated with check (author_id = auth.uid());
create policy "comments: delete own or admin" on public.comments
  for delete to authenticated using (author_id = auth.uid() or public.is_admin());

-- leads: أي زائر يستطيع إرسال طلب انضمام، والمدير فقط يرى ويعدّل
create policy "leads: anyone can submit" on public.leads
  for insert to anon, authenticated with check (status = 'new' and profile_id is null and notes is null);
create policy "leads: admin read" on public.leads
  for select to authenticated using (public.is_admin());
create policy "leads: admin update" on public.leads
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "leads: admin delete" on public.leads
  for delete to authenticated using (public.is_admin());

grant select on public.signal_stats to anon, authenticated;

-- =====================================================================
-- Realtime: بث التغييرات فورياً للموقع
-- =====================================================================
alter publication supabase_realtime add table public.signals, public.news, public.comments;
