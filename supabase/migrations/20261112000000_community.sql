-- =====================================================================
-- المجتمع: اسم الكاتب في التعليقات + حماية الإدراج
-- جدول profiles غير قابل للقراءة العامة (خصوصية)، لذا نحفظ اسم العرض
-- داخل التعليق نفسه عند الإدراج عبر trigger.
-- =====================================================================

alter table public.comments add column author_name text not null default 'عضو';

create or replace function public.set_comment_author()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- لا يمكن انتحال هوية مستخدم آخر
  new.author_id := coalesce(auth.uid(), new.author_id);
  select coalesce(nullif(trim(p.full_name), ''), 'عضو')
    into new.author_name
    from public.profiles p
   where p.id = new.author_id;
  new.author_name := coalesce(new.author_name, 'عضو');
  new.created_at := now();
  return new;
end $$;

create trigger comments_set_author
  before insert on public.comments
  for each row execute function public.set_comment_author();

-- منع الإغراق: حد أقصى 10 تعليقات في الدقيقة لكل مستخدم
create or replace function public.comments_rate_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.comments c
       where c.author_id = new.author_id and c.created_at > now() - interval '1 minute') >= 10 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return new;
end $$;

-- اسم يبدأ بـ z ليعمل بعد comments_set_author (الترتيب أبجدي)
create trigger comments_z_rate_limit
  before insert on public.comments
  for each row execute function public.comments_rate_limit();

-- عند تعديل الاسم في الملف الشخصي نحدّث الاسم في التعليقات السابقة
create or replace function public.sync_comment_author_name()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.full_name is distinct from old.full_name then
    update public.comments
       set author_name = coalesce(nullif(trim(new.full_name), ''), 'عضو')
     where author_id = new.id;
  end if;
  return new;
end $$;

create trigger profiles_sync_comment_name
  after update of full_name on public.profiles
  for each row execute function public.sync_comment_author_name();
