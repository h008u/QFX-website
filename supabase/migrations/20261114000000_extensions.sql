-- =====================================================================
-- إضافات: المشاهدات، ربط MT5، بوتات الاستراتيجيات، إشعارات المتصفح
-- =====================================================================

alter type public.signal_source add value if not exists 'mt5';
alter type public.signal_source add value if not exists 'strategy';
alter type public.post_kind add value if not exists 'mt5';

-- مشاهدات المنشور في القنوات العامة (تُقرأ من t.me/s)
alter table public.posts add column views int;

-- صفقات MT5 ليس لها وقف/هدف دائماً
alter table public.signals alter column stop_loss drop not null;
alter table public.signals alter column take_profit_1 drop not null;
-- مرجع خارجي (تذكرة MT5 أو إشارة استراتيجية) لربط التحديثات بالتوصية
alter table public.signals add column external_ref text unique;
-- الاستراتيجية التي ولّدت الإشارة + بيانات متابعتها (تحريك الوقف للدخول بعد الهدف الأول)
alter table public.signals add column strategy text;
alter table public.signals add column meta jsonb;
create index signals_strategy_idx on public.signals (strategy) where strategy is not null;

-- =====================================================================
-- اشتراكات إشعارات المتصفح (Web Push) للفريق
-- =====================================================================
create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
create policy "push: own rows" on public.push_subscriptions for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid() and public.is_staff());

-- =====================================================================
-- نتائج اختبار الاستراتيجيات على التاريخ
-- =====================================================================
create table public.backtests (
  id          uuid primary key default gen_random_uuid(),
  strategy    text not null,
  symbol      text not null,
  timeframe   text not null,
  params      jsonb not null default '{}',
  stats       jsonb not null,
  trades      jsonb not null default '[]',
  equity      jsonb not null default '[]',
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
alter table public.backtests enable row level security;
create policy "backtests: staff read" on public.backtests for select to authenticated using (public.is_staff());
create policy "backtests: editor write" on public.backtests for all to authenticated using (public.is_editor()) with check (public.is_editor());
