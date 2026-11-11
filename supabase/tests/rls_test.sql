-- اختبارات صلاحيات RLS — تفشل عند أول خطأ (ON_ERROR_STOP)
\set ON_ERROR_STOP 1
\set QUIET 1

create or replace function pg_temp.expect_error(sql text, label text) returns void language plpgsql as $$
begin
  execute sql;
  raise exception 'FAIL: % (expected an error)', label;
exception when others then
  if sqlerrm like 'FAIL:%' then raise; end if;
end $$;

create or replace function pg_temp.check(cond boolean, label text) returns void language plpgsql as $$
begin
  if not coalesce(cond, false) then raise exception 'FAIL: %', label; end if;
end $$;

insert into auth.users (id, raw_user_meta_data) values
 ('11111111-1111-1111-1111-111111111111', '{"full_name":"أحمد","referred_by":"abc123"}'),
 ('22222222-2222-2222-2222-222222222222', '{}'),
 ('33333333-3333-3333-3333-333333333333', '{"full_name":"المدير"}');
update public.profiles set role = 'admin' where id = '33333333-3333-3333-3333-333333333333';
select pg_temp.check((select referred_by = 'abc123' and full_name = 'أحمد' from profiles where id = '11111111-1111-1111-1111-111111111111'), 'profile created from signup metadata');

-- ===== زائر (anon) =====
set role anon;
select pg_temp.check((select count(*) > 0 from signals), 'anon reads signals');
select pg_temp.check((select count(*) > 0 from news), 'anon reads news');
select pg_temp.check((select total > 0 from signal_stats), 'anon reads stats');
select pg_temp.expect_error($$insert into signals (symbol,direction,entry_price,stop_loss,take_profit_1) values ('EURUSD','BUY',1,0.9,1.1)$$, 'anon cannot insert signals');
insert into leads (full_name, telegram_username) values ('زائر', 'visitor');
select pg_temp.expect_error($$insert into leads (full_name, telegram_username, status) values ('x','y','verified')$$, 'anon cannot set lead status');
select pg_temp.check((select count(*) = 0 from leads), 'anon cannot read leads');
select pg_temp.check((select count(*) = 0 from profiles), 'anon cannot read profiles');
reset role;

-- ===== عضو =====
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select pg_temp.check((select count(*) = 1 from profiles), 'member sees only own profile');
update profiles set full_name = 'أحمد علي' where id = '11111111-1111-1111-1111-111111111111';
select pg_temp.expect_error($$update profiles set role = 'admin' where id = '11111111-1111-1111-1111-111111111111'$$, 'member cannot change own role');
insert into comments (author_id, news_id, body) select '22222222-2222-2222-2222-222222222222', id, 'spoof' from news limit 1;
select pg_temp.check((select count(*) = 0 from leads), 'member cannot read leads');
reset role;
select pg_temp.check((select bool_and(author_id = '11111111-1111-1111-1111-111111111111' and author_name = 'أحمد علي') from comments), 'comment author forced to auth.uid with display name');
select pg_temp.check((select role = 'member' from profiles where id = '11111111-1111-1111-1111-111111111111'), 'role unchanged');

-- عضو لا يستطيع تعديل توصيات (RLS يُخفي الصفوف فلا تتأثر)
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
update signals set status = 'cancelled';
reset role;
select pg_temp.check((select count(*) = 0 from signals where status = 'cancelled'), 'member cannot update signals');

-- حد التعليقات: 10 في الدقيقة
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
do $$ begin for i in 1..10 loop insert into comments (author_id, news_id, body) select auth.uid(), id, 'c' || i from news limit 1; end loop; end $$;
select pg_temp.expect_error($$insert into comments (author_id, news_id, body) select auth.uid(), id, 'x' from news limit 1$$, 'comment rate limit');
reset role;

-- ===== مدير =====
set role authenticated;
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select pg_temp.check((select count(*) = 1 from leads), 'admin reads leads');
update leads set status = 'verified';
insert into signals (symbol, direction, entry_price, stop_loss, take_profit_1) values ('EURUSD', 'BUY', 1.08, 1.07, 1.09);
reset role;
select pg_temp.check((select status = 'verified' from leads limit 1), 'admin updates leads');

-- مزامنة الاسم في التعليقات
update profiles set full_name = 'أحمد المحدّث' where id = '11111111-1111-1111-1111-111111111111';
select pg_temp.check((select bool_and(author_name = 'أحمد المحدّث') from comments where author_id = '11111111-1111-1111-1111-111111111111'), 'name sync to comments');


-- ===== لوحة الإدارة: أدوار الفريق =====
insert into auth.users (id, raw_user_meta_data) values
 ('44444444-4444-4444-4444-444444444444', '{"full_name":"محرر"}'),
 ('55555555-5555-5555-5555-555555555555', '{"full_name":"مشاهد"}');
update profiles set role = 'editor' where id = '44444444-4444-4444-4444-444444444444';
update profiles set role = 'viewer' where id = '55555555-5555-5555-5555-555555555555';
insert into posts (kind, status, body) values ('news', 'pending', 'خبر ينتظر الموافقة');
insert into task_runs (task, ok) values ('news', true);

-- المحرر يكتب وينشر
set role authenticated;
set request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
insert into posts (kind, status, body, created_by) values ('manual', 'scheduled', 'منشور مجدول', auth.uid());
update posts set status = 'rejected' where body = 'خبر ينتظر الموافقة';
insert into settings (key, value) values ('signature', '"QFX"');
insert into price_alerts (symbol, direction, price) values ('XAUUSD', 'above', 2400);
insert into audit_log (actor_id, action) values (auth.uid(), 'post.create');
select pg_temp.expect_error($$insert into audit_log (actor_id, action) values ('33333333-3333-3333-3333-333333333333', 'spoof')$$, 'editor cannot log as another user');
select pg_temp.check((select count(*) >= 5 from profiles), 'editor sees members');
select pg_temp.check((select count(*) = 1 from task_runs), 'editor reads task runs');
select pg_temp.expect_error($$update profiles set role = 'admin' where id = auth.uid()$$, 'editor cannot promote self');
reset role;
select pg_temp.check((select status = 'rejected' from posts where body = 'خبر ينتظر الموافقة'), 'editor updates posts');

-- المشاهد يقرأ فقط
set role authenticated;
set request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
select pg_temp.check((select count(*) = 2 from posts), 'viewer reads posts');
select pg_temp.check((select count(*) = 1 from settings), 'viewer reads settings');
select pg_temp.expect_error($$insert into posts (kind, body) values ('manual', 'x')$$, 'viewer cannot create posts');
select pg_temp.expect_error($$insert into settings (key, value) values ('x_y', '1')$$, 'viewer cannot write settings');
update price_alerts set active = false;
reset role;
select pg_temp.check((select bool_and(active) from price_alerts), 'viewer cannot update alerts');

-- العضو العادي لا يرى شيئاً من اللوحة
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select pg_temp.check((select count(*) = 0 from posts), 'member cannot read posts');
select pg_temp.check((select count(*) = 0 from settings), 'member cannot read settings');
select pg_temp.check((select count(*) = 0 from audit_log), 'member cannot read audit');
select pg_temp.check((select count(*) = 1 from profiles), 'member still sees only own profile');
reset role;

-- الزائر
set role anon;
select pg_temp.check((select count(*) = 0 from posts), 'anon cannot read posts');
reset role;

\echo 'ALL RLS TESTS PASSED'
